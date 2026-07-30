<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\ChangeRequestDocumentRepository;
use App\Repositories\PersonalInfoChangeRequestRepository;
use App\Services\FiscalProfile\PersonalInfoChangeRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PersonalInfoChangeRequestController extends Controller
{
    public function __construct(
        protected PersonalInfoChangeRequestRepository $changeRequestRepository,
        protected ChangeRequestDocumentRepository $documentRepository,
        protected PersonalInfoChangeRequestService $changeRequestService
    ) {}

    /**
     * Submit a new personal info change request.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'requested_marital_status' => 'nullable|in:single,married,divorced,widowed',
            'requested_children_count' => 'nullable|integer|min:0',
            'requested_disabled_children_count' => 'nullable|integer|min:0',
            'requested_student_children_count' => 'nullable|integer|min:0',
            'claimed_effective_date' => 'required|date|after_or_equal:today',
        ]);

        $userId = $request->user()->id;

        try {
            $changeRequest = $this->changeRequestService->submitRequest($userId, $request->all());

            return response()->json([
                'message' => 'Change request submitted successfully',
                'data' => $changeRequest->load('documents'),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get all change requests for the current employee.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $requests = $this->changeRequestRepository->getByEmployee($userId);

        return response()->json($requests);
    }

    /**
     * Get a specific change request.
     */
    public function show(string $id): JsonResponse
    {
        $request = $this->changeRequestRepository->find($id);
        if (!$request) {
            return response()->json(['message' => 'Change request not found'], 404);
        }

        // Ensure user can only see their own requests
        if (auth()->id() !== $request->employee_id && !auth()->user()->isRH()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($request->load(['documents', 'employee', 'reviewedBy']));
    }

    /**
     * Upload a document for a change request.
     */
    public function uploadDocument(Request $request, string $changeRequestId): JsonResponse
    {
        $request->validate([
            'document_type' => 'required|in:marriage_certificate,divorce_judgment,death_certificate,birth_certificate,disability_certificate,school_enrollment_certificate',
            'document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $changeRequest = $this->changeRequestRepository->find($changeRequestId);
        if (!$changeRequest) {
            return response()->json(['message' => 'Change request not found'], 404);
        }

        // Ensure user can only upload to their own requests
        if (auth()->id() !== $changeRequest->employee_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Only allow uploads for pending requests
        if ($changeRequest->status !== 'pending') {
            return response()->json(['message' => 'Documents can only be uploaded for pending requests'], 400);
        }

        try {
            $path = $request->file('document')->store('documents/change_requests', 'public');

            $document = $this->documentRepository->create([
                'id' => \Illuminate\Support\Str::uuid(),
                'change_request_id' => $changeRequestId,
                'document_type' => $request->document_type,
                'file_path' => $path,
                'verified_by_hr' => false,
            ]);

            return response()->json([
                'message' => 'Document uploaded successfully',
                'data' => $document,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to upload document: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verify a document (HR only).
     */
    public function verifyDocument(Request $request, string $documentId): JsonResponse
    {
        if (!$request->user()->isRH()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'verification_notes' => 'nullable|string|max:500',
        ]);

        try {
            $this->documentRepository->verifyDocument(
                $documentId,
                $request->user()->id,
                $request->verification_notes
            );

            return response()->json(['message' => 'Document verified successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Approve a change request (HR only).
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->isRH()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $result = $this->changeRequestService->approveRequest($id, $request->user()->id);

            return response()->json([
                'message' => $result['message'],
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Reject a change request (HR only).
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->isRH()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $this->changeRequestService->rejectRequest($id, $request->reason, $request->user()->id);

            return response()->json(['message' => 'Change request rejected successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Request more information for a change request (HR only).
     */
    public function requestMoreInfo(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->isRH()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $this->changeRequestService->requestMoreInfo($id, $request->reason, $request->user()->id);

            return response()->json(['message' => 'Request marked as needs more info']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Get all pending change requests for HR review.
     */
    public function indexForHR(Request $request): JsonResponse
    {
        if (!$request->user()->isRH()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $status = $request->query('status', 'pending');

        if ($status === 'pending') {
            $requests = $this->changeRequestRepository->getPendingForHR();
        } elseif ($status === 'needs_more_info') {
            $requests = $this->changeRequestRepository->getNeedsMoreInfoForHR();
        } else {
            $requests = $this->changeRequestRepository->all()->load(['employee', 'documents']);
        }

        return response()->json($requests);
    }
}
