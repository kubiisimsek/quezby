<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FinishRunRequest extends FormRequest
{
    /**
     * Only the log's envelope is checked here. What is inside each action is
     * the engine's to judge, so a bad action becomes `run_rejected`.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'actions' => ['present', 'array', 'list', 'max:'.config('quezby.runs.max_actions')],
            'clientScore' => ['required', 'integer', 'min:0'],
            'clientReels' => ['required', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<mixed>
     */
    public function actions(): array
    {
        return $this->validated('actions');
    }
}
