<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CvConfirmationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'skills' => 'required|array',
            'skills.technical_skills' => 'array',
            'skills.soft_skills' => 'array',
            'skills.languages_spoken' => 'array',
            'skills.certifications' => 'array',
        ];
    }

    public function messages(): array
    {
        return [
            'skills.required' => 'Skills data is required.',
            'skills.array' => 'Skills must be an array.',
        ];
    }
}
