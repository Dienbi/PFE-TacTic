<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PaieRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'utilisateur_id' => 'required|exists:utilisateurs,id',
            'periode_debut' => 'required|date',
            'periode_fin' => 'required|date|after:periode_debut',
        ];
    }

    public function messages(): array
    {
        return [
            'utilisateur_id.required' => 'L\'utilisateur est obligatoire.',
            'utilisateur_id.exists' => 'L\'utilisateur sélectionné n\'existe pas.',
            'periode_debut.required' => 'La date de début est obligatoire.',
            'periode_fin.required' => 'La date de fin est obligatoire.',
            'periode_fin.after' => 'La date de fin doit être après la date de début.',
        ];
    }
}
