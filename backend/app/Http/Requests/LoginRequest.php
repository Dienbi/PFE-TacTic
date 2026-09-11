<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'The email is required.',
            'email.email' => 'The email must be valid.',
            'password.required' => 'The password is required.',
            'password.min' => 'The password must contain at least 6 characters.',
        ];
    }
}
