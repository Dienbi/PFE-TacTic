<?php

namespace App\Http\Requests;

use App\Enums\Role;
use App\Enums\TypeContrat;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'email' => 'required|email|unique:utilisateurs,email',
            'password' => 'required|string|min:6|confirmed',
            'telephone' => 'nullable|string|max:20',
            'adresse' => 'nullable|string|max:255',
            'date_embauche' => 'nullable|date',
            'type_contrat' => ['nullable', new Enum(TypeContrat::class)],
            'salaire_base' => 'nullable|numeric|min:0',
            'role' => ['nullable', new Enum(Role::class)],
        ];
    }

    public function messages(): array
    {
        return [
            'nom.required' => 'The last name is required.',
            'prenom.required' => 'The first name is required.',
            'email.required' => 'The email is required.',
            'email.email' => 'The email must be valid.',
            'email.unique' => 'This email is already in use.',
            'password.required' => 'The password is required.',
            'password.min' => 'The password must contain at least 6 characters.',
            'password.confirmed' => 'The password confirmation does not match.',
        ];
    }
}
