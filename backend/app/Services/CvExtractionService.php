<?php

namespace App\Services;

use App\Models\CvUpload;
use App\Repositories\CvUploadRepository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CvExtractionService
{
    private CvUploadRepository $cvUploadRepository;
    private CvTextExtractionService $textExtractionService;
    private CvAiService $cvAiService;

    public function __construct(
        CvUploadRepository $cvUploadRepository,
        CvTextExtractionService $textExtractionService,
        CvAiService $cvAiService
    ) {
        $this->cvUploadRepository = $cvUploadRepository;
        $this->textExtractionService = $textExtractionService;
        $this->cvAiService = $cvAiService;
    }

    public function processCvUpload(int $cvUploadId): void
    {
        Log::info("Starting CV extraction for upload ID: {$cvUploadId}");
        
        $cvUpload = $this->cvUploadRepository->findOrFail($cvUploadId);

        try {
            // Update status to processing
            $this->updateExtractionStatus($cvUploadId, 'processing');
            Log::info("Updated status to processing for CV upload ID: {$cvUploadId}");

            // Get absolute file path to send to AI service
            $filePath = $this->getAbsoluteFilePath($cvUpload->file_path);
            Log::info("File path for CV upload ID {$cvUploadId}: {$filePath}");

            // Call AI service for skill extraction (AI service will handle text extraction)
            Log::info("Calling AI service for CV upload ID: {$cvUploadId}");
            $extractedData = $this->cvAiService->extractSkills($filePath);
            Log::info("AI service returned data for CV upload ID {$cvUploadId}", ['data' => $extractedData]);

            // Update status to completed with extracted data
            $this->updateExtractionStatus($cvUploadId, 'completed', $extractedData);

            // Cache the result
            Cache::put("ai:cv_extraction:{$cvUploadId}", $extractedData, 86400); // 24 hours

            Log::info("CV extraction completed successfully for upload ID: {$cvUploadId}");
        } catch (\Exception $e) {
            Log::error("CV extraction failed for upload ID {$cvUploadId}: ".$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            $this->updateExtractionStatus($cvUploadId, 'failed', null, $e->getMessage());
            throw $e;
        }
    }

    public function updateExtractionStatus(int $cvUploadId, string $status, ?array $data = null, ?string $error = null): void
    {
        $this->cvUploadRepository->updateStatus($cvUploadId, $status, $data, $error);
    }

    public function getExtractionStatus(int $cvUploadId): array
    {
        $cvUpload = $this->cvUploadRepository->findOrFail($cvUploadId);

        return [
            'id' => $cvUpload->id,
            'status' => $cvUpload->status,
            'extracted_data' => $cvUpload->extracted_data,
            'error_message' => $cvUpload->error_message,
            'created_at' => $cvUpload->created_at,
            'updated_at' => $cvUpload->updated_at,
        ];
    }

    private function getAbsoluteFilePath(string $filePath): string
    {
        $fullPath = storage_path('app/public/'.$filePath);

        if (!file_exists($fullPath)) {
            throw new \RuntimeException('File not found: '.$filePath);
        }

        return $fullPath;
    }
}
