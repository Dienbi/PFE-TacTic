<?php

namespace App\Http\Controllers\Api\FiscalProfile;

use App\Http\Controllers\Controller;
use App\Services\FiscalProfile\FiscalProfileAssignmentService;
use App\Services\FiscalProfile\FiscalProfileAuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class EmployeeFiscalProfileAssignmentController extends Controller
{
    private FiscalProfileAssignmentService $assignmentService;
    private FiscalProfileAuditService $auditService;

    public function __construct(
        FiscalProfileAssignmentService $assignmentService,
        FiscalProfileAuditService $auditService
    ) {
        $this->assignmentService = $assignmentService;
        $this->auditService = $auditService;
    }

    /**
     * Get fiscal profile history for an employee.
     * GET /api/employees/{id}/fiscal-profile-history
     */
    public function history(string $employeeId): JsonResponse
    {
        // Employees can see their own history, RH can see all
        if (Auth::user()->role->value !== 'RH' && Auth::id() != $employeeId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $history = $this->assignmentService->getEmployeeHistory($employeeId);
        return response()->json($history);
    }

    /**
     * Get current fiscal profile for an employee.
     * GET /api/employees/{id}/fiscal-profile
     */
    public function current(string $employeeId): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH' && Auth::id() != $employeeId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $profile = $this->assignmentService->getCurrentProfile($employeeId);
        
        if (!$profile) {
            return response()->json(['message' => 'No fiscal profile assigned'], 404);
        }

        return response()->json($profile);
    }

    /**
     * Bulk assign fiscal profile to multiple employees.
     * POST /api/fiscal-profile-groups/{id}/bulk-assign
     */
    public function bulkAssign(Request $request, string $groupId): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'required|integer',
            'effective_from' => 'required|date',
            'ai_message_id' => 'nullable|string', // If from AI chatbot
        ]);

        try {
            $assignmentIds = $this->assignmentService->bulkAssign(
                $validated['employee_ids'],
                $groupId,
                $validated['effective_from'],
                Auth::id()
            );

            // Log the assignment
            if (isset($validated['ai_message_id'])) {
                $this->auditService->logBulkAssignedViaAi(
                    Auth::id(),
                    $assignmentIds,
                    $validated['ai_message_id'],
                    [
                        'group_id' => $groupId,
                        'effective_from' => $validated['effective_from'],
                        'employee_count' => count($validated['employee_ids']),
                    ]
                );
            } else {
                foreach ($assignmentIds as $assignmentId) {
                    $this->auditService->logProfileAssigned(
                        Auth::id(),
                        $assignmentId,
                        null,
                        [
                            'group_id' => $groupId,
                            'effective_from' => $validated['effective_from'],
                        ]
                    );
                }
            }

            return response()->json([
                'message' => 'Fiscal profiles assigned successfully',
                'assignment_ids' => $assignmentIds,
                'count' => count($assignmentIds),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to assign fiscal profiles',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Find employees matching fiscal criteria (for AI service).
     * GET /api/employees/fiscal-search
     */
    public function search(Request $request): JsonResponse
    {
        // This endpoint is for AI service - no auth required (IP whitelisted)
        $validated = $request->validate([
            'gender' => 'nullable|in:male,female',
            'marital_status' => 'nullable|in:single,married,divorced,widowed',
            'children_count' => 'nullable|integer|min:0',
            'disabled_children_count' => 'nullable|integer|min:0',
            'student_children_count' => 'nullable|integer|min:0',
            'exclude_group_id' => 'nullable|string',
        ]);

        $employees = $this->assignmentService->findMatchingEmployees($validated);
        return response()->json($employees);
    }

    /**
     * Assign a fiscal profile to a single employee.
     * POST /api/employees/{id}/fiscal-profile-assign
     */
    public function assign(Request $request, string $employeeId): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'group_id' => 'required|string',
            'effective_from' => 'required|date',
            'ai_message_id' => 'nullable|string',
        ]);

        try {
            $group = \App\Models\FiscalProfileGroup::findOrFail($validated['group_id']);
            $groupAttributes = [
                'gender' => $group->gender,
                'marital_status' => $group->marital_status,
                'children_count' => $group->children_count,
                'disabled_children_count' => $group->disabled_children_count,
                'student_non_scholarship_children_count' => $group->student_non_scholarship_children_count,
            ];

            $assignment = $this->assignmentService->assignProfile(
                $employeeId,
                $groupAttributes,
                $validated['effective_from'],
                Auth::id(),
                null
            );

            // Log the assignment
            $this->auditService->logProfileAssigned(
                Auth::id(),
                $assignment->id,
                $validated['ai_message_id'] ?? null,
                [
                    'group_id' => $validated['group_id'],
                    'effective_from' => $validated['effective_from'],
                ]
            );

            return response()->json([
                'message' => 'Fiscal profile assigned successfully',
                'assignment' => $assignment,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to assign fiscal profile',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Reassign an employee from one fiscal profile to another.
     * POST /api/employees/{id}/fiscal-profile-reassign
     */
    public function reassign(Request $request, string $employeeId): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'new_group_id' => 'required|string',
            'effective_from' => 'required|date',
            'ai_message_id' => 'nullable|string',
        ]);

        try {
            $newGroup = \App\Models\FiscalProfileGroup::findOrFail($validated['new_group_id']);
            $newGroupAttributes = [
                'gender' => $newGroup->gender,
                'marital_status' => $newGroup->marital_status,
                'children_count' => $newGroup->children_count,
                'disabled_children_count' => $newGroup->disabled_children_count,
                'student_non_scholarship_children_count' => $newGroup->student_non_scholarship_children_count,
            ];

            $assignment = $this->assignmentService->assignProfile(
                $employeeId,
                $newGroupAttributes,
                $validated['effective_from'],
                Auth::id(),
                null
            );

            // Log the reassignment
            $this->auditService->logProfileReassigned(
                Auth::id(),
                $assignment->id,
                $validated['ai_message_id'] ?? null,
                [
                    'new_group_id' => $validated['new_group_id'],
                    'effective_from' => $validated['effective_from'],
                ]
            );

            return response()->json([
                'message' => 'Fiscal profile reassigned successfully',
                'assignment' => $assignment,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to reassign fiscal profile',
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}
