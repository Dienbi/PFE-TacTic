<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

class CvTextExtractionService
{
    private const MIN_TEXT_LENGTH = 50;

    public function extractFromPdf(string $filePath): string
    {
        $fullPath = Storage::disk('public')->path($filePath);

        if (!file_exists($fullPath)) {
            throw new \RuntimeException('File not found: '.$filePath);
        }

        // For now, we'll use a simple approach. In production, you might want to use
        // a PHP library like smalot/pdfparser or call a Python script for better extraction
        // For this implementation, we'll assume the file is text-extractable
        // and return a placeholder. The actual extraction will be done in Python.

        throw new \RuntimeException('PDF text extraction should be done in Python service. Send file path to AI service instead.');
    }

    public function extractFromDocx(string $filePath): string
    {
        $fullPath = Storage::disk('public')->path($filePath);

        if (!file_exists($fullPath)) {
            throw new \RuntimeException('File not found: '.$filePath);
        }

        // Similar to PDF, DOCX extraction is better handled in Python
        throw new \RuntimeException('DOCX text extraction should be done in Python service. Send file path to AI service instead.');
    }

    public function validateTextLength(string $text): bool
    {
        return strlen($text) >= self::MIN_TEXT_LENGTH;
    }

    public function detectFileType(string $filePath): string
    {
        $extension = pathinfo($filePath, PATHINFO_EXTENSION);

        return match (strtolower($extension)) {
            'pdf' => 'pdf',
            'docx' => 'docx',
            default => throw new \InvalidArgumentException('Unsupported file type: '.$extension),
        };
    }
}
