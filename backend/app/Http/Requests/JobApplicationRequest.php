<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JobApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'job_post_id' => 'required|integer|exists:job_posts,id',
            'motivation' => 'required|string|min:10',
        ];
    }

    public function messages(): array
    {
        return [
            'job_post_id.required' => 'Le poste est obligatoire.',
            'job_post_id.exists' => 'Le poste sélectionné n\'existe pas.',
            'motivation.required' => 'La lettre de motivation est obligatoire.',
            'motivation.min' => 'La lettre de motivation doit contenir au moins 10 caractères.',
        ];
    }
}
