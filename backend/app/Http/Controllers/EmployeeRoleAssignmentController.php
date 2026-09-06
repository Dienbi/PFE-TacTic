<?php

namespace App\Http\Controllers;

use App\Services\RoleAssignmentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EmployeeRoleAssignmentController extends Controller
{
    public function __construct(
        protected RoleAssignmentService $roleAssignmentService
    ) {}

    public function getAllEmployees(): JsonResponse
    {
        $employees = \App\Models\Utilisateur::select('id', 'nom', 'prenom', 'matricule', 'email')
            ->where('deleted_at', null)
            ->get();
        return response()->json($employees);
    }

    public function assign(Request $request, $employeeId): JsonResponse
    {
        $validated = $request->validate([
            'role_profile_id' => 'required|uuid',
            'effective_from' => 'required|date',
        ]);

        try {
            $assignment = $this->roleAssignmentService->assignEmployee(
                $employeeId,
                $validated['role_profile_id'],
                $validated['effective_from']
            );
            return response()->json($assignment, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function reassign(Request $request, $employeeId): JsonResponse
    {
        $validated = $request->validate([
            'role_profile_id' => 'required|uuid',
            'effective_from' => 'required|date',
        ]);

        try {
            $assignment = $this->roleAssignmentService->reassignEmployee(
                $employeeId,
                $validated['role_profile_id'],
                $validated['effective_from']
            );
            return response()->json($assignment, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function getCurrent($employeeId): JsonResponse
    {
        $assignment = $this->roleAssignmentService->getCurrentAssignment($employeeId);
        if (!$assignment) {
            return response()->json(['message' => 'No current assignment found'], 404);
        }
        return response()->json($assignment);
    }

    public function getHistory($employeeId): JsonResponse
    {
        $history = $this->roleAssignmentService->getAssignmentHistory($employeeId);
        return response()->json($history);
    }

    public function bulkAssign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'assignments' => 'required|array',
            'assignments.*.employee_id' => 'required|integer',
            'assignments.*.role_profile_id' => 'required|uuid',
            'assignments.*.effective_from' => 'required|date',
        ]);

        try {
            $assignments = $this->roleAssignmentService->bulkAssign($validated['assignments']);
            return response()->json($assignments, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function close(Request $request, $assignmentId): JsonResponse
    {
        $validated = $request->validate([
            'effective_to' => 'required|date',
        ]);

        try {
            $assignment = $this->roleAssignmentService->closeAssignment(
                $assignmentId,
                $validated['effective_to']
            );
            return response()->json($assignment);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
