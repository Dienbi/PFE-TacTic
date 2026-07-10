<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CvUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cv' => 'required|file|mimes:pdf,docx|max:5120', // 5MB max
        ];
    }

    public function messages(): array
    {
        return [
            'cv.required' => 'Please upload a CV file.',
            'cv.file' => 'The CV must be a file.',
            'cv.mimes' => 'The CV must be a PDF or DOCX file.',
            'cv.max' => 'The CV must not exceed 5MB.',
        ];
    }
}
