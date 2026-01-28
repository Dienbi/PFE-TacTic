<?php

namespace App\Http\Requests;

use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Enums\TypeContrat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UtilisateurRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('id');

        $rules = [
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'email' => 'required|email|unique:utilisateurs,email,' . $userId,
            'telephone' => 'nullable|string|max:20',
            'adresse' => 'nullable|string|max:255',
            'date_embauche' => 'nullable|date',
            'type_contrat' => ['nullable', new Enum(TypeContrat::class)],
            'salaire_base' => 'nullable|numeric|min:0',
            'status' => ['nullable', new Enum(EmployeStatus::class)],
            'role' => ['nullable', new Enum(Role::class)],
            'actif' => 'nullable|boolean',
            'solde_conge' => 'nullable|integer|min:0',
            'equipe_id' => 'nullable|exists:equipes,id',
        ];

        // Password only required on create
        if ($this->isMethod('post')) {
            $rules['password'] = 'required|string|min:6';
        } else {
            $rules['password'] = 'nullable|string|min:6';
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'nom.required' => 'Le nom est obligatoire.',
            'prenom.required' => 'Le prénom est obligatoire.',
            'email.required' => 'L\'email est obligatoire.',
            'email.email' => 'L\'email doit être valide.',
            'email.unique' => 'Cet email est déjà utilisé.',
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.min' => 'Le mot de passe doit contenir au moins 6 caractères.',
            'equipe_id.exists' => 'L\'équipe sélectionnée n\'existe pas.',
        ];
    }
}
