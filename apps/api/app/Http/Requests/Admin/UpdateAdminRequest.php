<?php

namespace App\Http\Requests\Admin;

use App\Enums\AdminRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdminRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'min:2', 'max:64'],
            'role' => ['sometimes', Rule::enum(AdminRole::class)],
            'disabled' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array{name?: string, role?: AdminRole, disabled?: bool}
     */
    public function changes(): array
    {
        $changes = [];
        if ($this->has('name')) {
            $changes['name'] = trim((string) $this->validated('name'));
        }
        if ($this->has('role')) {
            $changes['role'] = AdminRole::from((string) $this->validated('role'));
        }
        if ($this->has('disabled')) {
            $changes['disabled'] = (bool) $this->validated('disabled');
        }

        return $changes;
    }
}
