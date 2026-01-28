<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EquipeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nom' => 'required|string|max:255',
            'chef_equipe_id' => 'nullable|exists:utilisateurs,id',
        ];
    }

    public function messages(): array
    {
        return [
            'nom.required' => 'Le nom de l\'équipe est obligatoire.',
            'chef_equipe_id.exists' => 'Le chef d\'équipe sélectionné n\'existe pas.',
        ];
    }
}
