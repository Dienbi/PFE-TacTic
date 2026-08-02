<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JobRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'titre' => 'required|string|max:255',
            'description' => 'required|string',
            'equipe_id' => 'sometimes|integer|exists:equipes,id',
        ];
    }

    public function messages(): array
    {
        return [
            'titre.required' => 'The title is required.',
            'titre.max' => 'The title cannot exceed 255 characters.',
            'description.required' => 'The description is required.',
            'equipe_id.exists' => 'The selected team does not exist.',
        ];
    }
}
