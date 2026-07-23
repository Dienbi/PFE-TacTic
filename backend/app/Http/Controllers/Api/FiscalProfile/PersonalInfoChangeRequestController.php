<?php

namespace App\Http\Controllers\Api\FiscalProfile;

use App\Http\Controllers\Controller;
use App\Services\FiscalProfile\PersonalInfoChangeRequestService;
use App\Services\FiscalProfile\FiscalProfileAuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class PersonalInfoChangeRequestController extends Controller
{
    private PersonalInfoChangeRequestService $requestService;
    private FiscalProfileAuditService $auditService;

    public function __construct(
        PersonalInfoChangeRequestService $requestService,
        FiscalProfileAuditService $auditService
    ) {
        $this->requestService = $requestService;
        $this->auditService = $auditService;
    }

    /**
     * Submit a new personal info change request.
     * POST /api/change-requests
     */
    public function submit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'requested_marital_status' => 'nullable|in:single,married,divorced,widowed',
            'requested_children_count' => 'nullable|integer|min:0',
            'requested_disabled_children_count' => 'nullable|integer|min:0',
            'requested_student_children_count' => 'nullable|integer|min:0',
            'claimed_effective_date' => 'required|date|after_or_equal:today',
            'documents' => 'required|array',
            'documents.*.type' => 'required|in:marriage_certificate,divorce_judgment,death_certificate,birth_certificate,disability_certificate,school_enrollment_certificate',
            'documents.*.path' => 'required|string',
        ]);

        try {
            $changeRequest = $this->requestService->submitRequest(
                [
                    'employee_id' => Auth::id(),
                    ...$validated,
                ],
                $validated['documents']
            );

            // Log the submission
            $this->auditService->logChangeRequestSubmitted(
                Auth::id(),
                $changeRequest->id,
                [
                    'requested_changes' => [
                        'marital_status' => $validated['requested_marital_status'],
                        'children_count' => $validated['requested_children_count'],
                    ],
                ]
            );

            return response()->json([
                'message' => 'Change request submitted successfully',
                'request' => $changeRequest->load('documents'),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to submit change request',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get a specific change request.
     * GET /api/change-requests/{id}
     */
    public function show(string $id): JsonResponse
    {
        $request = $this->requestService->getRequestById($id);
        
        if (!$request) {
            return response()->json(['message' => 'Request not found'], 404);
        }

        // Authorization check
        if (Auth::user()->role->value !== 'RH' && $request->employee_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($request->load(['documents', 'employee', 'reviewedBy']));
    }

    /**
     * Get change requests with filtering.
     * GET /api/change-requests?status=pending
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $page = $request->query('page', 1);
        $perPage = $request->query('per_page', 15);

        // Authorization: only RH can see all requests
        if (Auth::user()->role->value !== 'RH') {
            // Employees can only see their own requests
            $requests = $this->requestService->getByEmployee(Auth::id());
            return response()->json($requests);
        }

        if ($status) {
            $requests = $this->requestService->getByStatus($status, $page, $perPage);
        } else {
            $requests = $this->requestService->getPendingRequests($page, $perPage);
        }

        return response()->json($requests);
    }

    /**
     * Upload/attach a document to a change request.
     * POST /api/change-requests/{id}/documents
     */
    public function uploadDocument(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:marriage_certificate,divorce_judgment,death_certificate,birth_certificate,disability_certificate,school_enrollment_certificate',
            'path' => 'required|string',
        ]);

        try {
            $document = $this->requestService->addDocument($id, $validated);
            return response()->json($document, 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to upload document',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Mark a document as verified by HR.
     * PATCH /api/change-requests/{id}/documents/{docId}/verify
     */
    public function verifyDocument(Request $request, string $id, string $docId): JsonResponse
    {
        $validated = $request->validate([
            'verified' => 'required|boolean',
            'notes' => 'nullable|string',
        ]);

        try {
            $document = $this->requestService->verifyDocument($docId, Auth::id(), $validated['notes']);
            return response()->json($document);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to verify document',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Approve a change request (HR only).
     * POST /api/change-requests/{id}/approve
     */
    public function approve(string $id): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $result = $this->requestService->approveRequest($id, Auth::id());

            // Log the approval
            $this->auditService->logChangeRequestApproved(
                Auth::id(),
                $id,
                $result
            );

            return response()->json([
                'message' => 'Change request approved successfully',
                'result' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to approve request',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Reject a change request (HR only).
     * POST /api/change-requests/{id}/reject
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'notes' => 'required|string',
        ]);

        try {
            $this->requestService->rejectRequest($id, Auth::id(), $validated['notes']);

            // Log the rejection
            $this->auditService->logChangeRequestRejected(
                Auth::id(),
                $id,
                ['notes' => $validated['notes']]
            );

            return response()->json(['message' => 'Change request rejected']);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to reject request',
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}
