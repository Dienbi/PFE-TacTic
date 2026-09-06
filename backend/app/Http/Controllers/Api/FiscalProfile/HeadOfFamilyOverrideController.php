<?php

namespace App\Http\Controllers\Api\FiscalProfile;

use App\Http\Controllers\Controller;
use App\Services\FiscalProfile\FiscalProfileAuditService;
use App\Repositories\FiscalProfile\HeadOfFamilyOverrideRepository;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class HeadOfFamilyOverrideController extends Controller
{
    private HeadOfFamilyOverrideRepository $overrideRepository;
    private FiscalProfileAuditService $auditService;

    public function __construct(
        HeadOfFamilyOverrideRepository $overrideRepository,
        FiscalProfileAuditService $auditService
    ) {
        $this->overrideRepository = $overrideRepository;
        $this->auditService = $auditService;
    }

    /**
     * Create a head-of-family override (admin only).
     * POST /api/employees/{id}/fiscal-profile-overrides
     */
    public function store(Request $request, string $employeeId): JsonResponse
    {
        // Only admin can create overrides
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'overridden_value' => 'required|boolean',
            'justification_note' => 'required|string',
            'document_file_path' => 'nullable|string',
        ]);

        try {
            $override = $this->overrideRepository->create([
                'employee_id' => $employeeId,
                'overridden_value' => $validated['overridden_value'],
                'justification_note' => $validated['justification_note'],
                'document_file_path' => $validated['document_file_path'] ?? null,
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);

            // Log the override
            $this->auditService->logHeadOfFamilyOverride(
                Auth::id(),
                $override->id,
                $validated
            );

            return response()->json([
                'message' => 'Head of family override created successfully',
                'override' => $override->load(['employee', 'approvedBy']),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create override',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get head-of-family overrides for an employee.
     * GET /api/employees/{id}/fiscal-profile-overrides
     */
    public function index(string $employeeId): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH' && Auth::id() != $employeeId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $overrides = $this->overrideRepository->findByEmployee($employeeId);
        return response()->json($overrides);
    }

    /**
     * Get active override for an employee.
     * GET /api/employees/{id}/fiscal-profile-overrides/active
     */
    public function active(string $employeeId): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH' && Auth::id() != $employeeId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $override = $this->overrideRepository->findActiveForEmployee($employeeId);

        if (!$override) {
            return response()->json(['message' => 'No active override found'], 404);
        }

        return response()->json($override->load(['approvedBy']));
    }
}
