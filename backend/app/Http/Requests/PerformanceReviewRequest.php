<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PerformanceReviewRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'utilisateur_id' => 'required|integer|exists:utilisateurs,id',
            'score' => 'required|numeric|min:1|max:10',
            'message' => 'required|string|max:500',
            'review_date' => 'required|date|date_format:Y-m-d',
        ];
    }

    public function messages(): array
    {
        return [
            'utilisateur_id.required' => 'Employee ID is required.',
            'utilisateur_id.exists' => 'Employee not found.',
            'score.required' => 'Score is required.',
            'score.min' => 'Score must be at least 1.',
            'score.max' => 'Score must not exceed 10.',
            'message.required' => 'Feedback message is required.',
            'message.max' => 'Feedback message must not exceed 500 characters.',
            'review_date.required' => 'Review date is required.',
            'review_date.date_format' => 'Review date must be in YYYY-MM-DD format.',
        ];
    }
}
