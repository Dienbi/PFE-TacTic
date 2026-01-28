<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AffectationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'utilisateur_id' => 'required|exists:utilisateurs,id',
            'poste_id' => 'required|exists:postes,id',
            'date_debut' => 'required|date',
            'date_fin' => 'nullable|date|after:date_debut',
        ];
    }

    public function messages(): array
    {
        return [
            'utilisateur_id.required' => 'L\'utilisateur est obligatoire.',
            'utilisateur_id.exists' => 'L\'utilisateur sélectionné n\'existe pas.',
            'poste_id.required' => 'Le poste est obligatoire.',
            'poste_id.exists' => 'Le poste sélectionné n\'existe pas.',
            'date_debut.required' => 'La date de début est obligatoire.',
            'date_fin.after' => 'La date de fin doit être après la date de début.',
        ];
    }
}
