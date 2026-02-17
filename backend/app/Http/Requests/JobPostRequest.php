<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JobPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'job_request_id' => 'nullable|integer|exists:job_requests,id',
            'titre' => 'required|string|max:255',
            'description' => 'required|string',
            'competences' => 'nullable|array',
            'competences.*.competence_id' => 'required|integer|exists:competences,id',
            'competences.*.niveau_requis' => 'required|integer|min:1|max:5',
        ];
    }

    public function messages(): array
    {
        return [
            'titre.required' => 'Le titre est obligatoire.',
            'titre.max' => 'Le titre ne peut pas dépasser 255 caractères.',
            'description.required' => 'La description est obligatoire.',
            'job_request_id.exists' => 'La demande de poste sélectionnée n\'existe pas.',
            'competences.array' => 'Les compétences doivent être un tableau.',
            'competences.*.competence_id.required' => 'L\'ID de la compétence est obligatoire.',
            'competences.*.competence_id.exists' => 'La compétence sélectionnée n\'existe pas.',
            'competences.*.niveau_requis.required' => 'Le niveau requis est obligatoire.',
            'competences.*.niveau_requis.min' => 'Le niveau requis doit être au minimum 1.',
            'competences.*.niveau_requis.max' => 'Le niveau requis ne peut pas dépasser 5.',
        ];
    }
}
