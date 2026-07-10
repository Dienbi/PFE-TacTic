<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CvUploadRequest;
use App\Http\Requests\CvConfirmationRequest;
use App\Jobs\ProcessCvUploadJob;
use App\Repositories\CvUploadRepository;
use App\Services\CvConfirmationService;
use App\Services\CvFileService;
use App\Services\CvExtractionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CvUploadController extends Controller
{
    private CvUploadRepository $cvUploadRepository;
    private CvFileService $cvFileService;
    private CvExtractionService $cvExtractionService;
    private CvConfirmationService $cvConfirmationService;

    public function __construct(
        CvUploadRepository $cvUploadRepository,
        CvFileService $cvFileService,
        CvExtractionService $cvExtractionService,
        CvConfirmationService $cvConfirmationService
    ) {
        $this->cvUploadRepository = $cvUploadRepository;
        $this->cvFileService = $cvFileService;
        $this->cvExtractionService = $cvExtractionService;
        $this->cvConfirmationService = $cvConfirmationService;
    }

    public function upload(CvUploadRequest $request): JsonResponse
    {
        try {
            $file = $request->file('cv');
            $userId = Auth::id();

            // Store file
            $filePath = $this->cvFileService->storeFile($file, $userId);

            // Create CV upload record
            $cvUpload = $this->cvUploadRepository->createCvUpload(
                $userId,
                $filePath,
                $file->getClientOriginalName()
            );

            // Dispatch job for async processing
            ProcessCvUploadJob::dispatch($cvUpload->id);

            return response()->json([
                'success' => true,
                'message' => 'CV uploaded successfully. Processing started.',
                'cv_upload_id' => $cvUpload->id,
                'status' => 'pending',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload CV: '.$e->getMessage(),
            ], 500);
        }
    }

    public function confirm(int $id, CvConfirmationRequest $request): JsonResponse
    {
        try {
            $confirmedSkills = $request->validated('skills');

            $this->cvConfirmationService->confirmSkills($id, $confirmedSkills);

            return response()->json([
                'success' => true,
                'message' => 'Skills confirmed and added to your profile.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to confirm skills: '.$e->getMessage(),
            ], 500);
        }
    }

    public function latest(Request $request): JsonResponse
    {
        try {
            $userId = Auth::id();
            $cvUpload = $this->cvUploadRepository->getByUserId($userId);

            if (!$cvUpload) {
                return response()->json([
                    'success' => true,
                    'data' => null,
                ]);
            }

            $status = $this->cvExtractionService->getExtractionStatus($cvUpload->id);

            return response()->json([
                'success' => true,
                'data' => $status,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get CV status: '.$e->getMessage(),
            ], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        try {
            $cvUpload = $this->cvUploadRepository->findOrFail($id);

            if ($cvUpload->utilisateur_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this CV upload.',
                ], 403);
            }

            $status = $this->cvExtractionService->getExtractionStatus($id);

            return response()->json([
                'success' => true,
                'data' => $status,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get CV upload: '.$e->getMessage(),
            ], 500);
        }
    }
}
