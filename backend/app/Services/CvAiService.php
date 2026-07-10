<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class CvAiService
{
    private AIService $aiService;

    public function __construct(AIService $aiService)
    {
        $this->aiService = $aiService;
    }

    public function extractSkills(string $cvText): array
    {
        try {
            $response = $this->aiService->extractCvSkills($cvText);

            if (isset($response['error'])) {
                throw new \RuntimeException($response['message'] ?? 'AI service error');
            }

            return $this->parseAiResponse($response);
        } catch (\Exception $e) {
            Log::error('CV AI extraction failed: '.$e->getMessage());
            throw $e;
        }
    }

    public function handleAiError(\Exception $error): void
    {
        Log::error('CV AI service error: '.$error->getMessage(), [
            'trace' => $error->getTraceAsString(),
        ]);
    }

    private function parseAiResponse(array $response): array
    {
        // Validate response structure
        $requiredKeys = ['technical_skills', 'soft_skills', 'languages_spoken', 'certifications'];

        foreach ($requiredKeys as $key) {
            if (!isset($response[$key])) {
                throw new \RuntimeException("Invalid AI response: missing {$key}");
            }

            if (!is_array($response[$key])) {
                throw new \RuntimeException("Invalid AI response: {$key} must be an array");
            }
        }

        return $response;
    }
}
