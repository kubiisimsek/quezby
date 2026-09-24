<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FinishRunRequest extends FormRequest
{
    /**
     * Only the log's envelope is checked here. What is inside each action is
     * the engine's to judge, so a bad action becomes `run_rejected`; what a
     * checkpoint receipt is worth is the verifier's.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'actions' => ['present', 'array', 'list', 'max:'.config('quezby.runs.max_actions')],
            'clientScore' => ['required', 'integer', 'min:0'],
            'clientReels' => ['required', 'integer', 'min:0'],
            // Any a buggy app sends pass; only the first `max_receipts` are read.
            'checkpoints' => ['sometimes', 'nullable', 'array', 'list', 'max:20'],
            'checkpoints.*' => ['string', 'max:512'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'checkpoints' => 'kontrol noktaları',
            'checkpoints.*' => 'kontrol noktası makbuzu',
        ];
    }

    /**
     * @return array<mixed>
     */
    public function actions(): array
    {
        return $this->validated('actions');
    }

    /**
     * The receipts of the run's checkpoints, as the API signed them; none
     * when the app sent none (an older app, or no network on the way).
     *
     * @return list<string>
     */
    public function checkpoints(): array
    {
        return array_values($this->validated('checkpoints') ?? []);
    }
}
