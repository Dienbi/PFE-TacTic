<?php

namespace App\Http\Controllers\Api\FiscalProfile;

use App\Http\Controllers\Controller;
use App\Services\FiscalProfile\FiscalProfileGroupService;
use App\Services\FiscalProfile\FiscalProfileAuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class FiscalProfileGroupController extends Controller
{
    private FiscalProfileGroupService $groupService;
    private FiscalProfileAuditService $auditService;

    public function __construct(
        FiscalProfileGroupService $groupService,
        FiscalProfileAuditService $auditService
    ) {
        $this->groupService = $groupService;
        $this->auditService = $auditService;
    }

    /**
     * List all fiscal profile groups.
     * GET /api/fiscal-profile-groups
     */
    public function index(): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $groups = $this->groupService->getAll();
        return response()->json($groups);
    }

    /**
     * Get a specific fiscal profile group.
     * GET /api/fiscal-profile-groups/{id}
     */
    public function show(string $id): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $group = $this->groupService->findById($id);

        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        return response()->json($group->load(['assignments', 'employees']));
    }

    /**
     * Create a new fiscal profile group manually.
     * POST /api/fiscal-profile-groups
     */
    public function store(Request $request): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'gender' => 'required|in:male,female',
            'marital_status' => 'required|in:single,married,divorced,widowed',
            'children_count' => 'required|integer|min:0',
            'disabled_children_count' => 'nullable|integer|min:0',
            'student_non_scholarship_children_count' => 'nullable|integer|min:0',
        ]);

        try {
            $group = $this->groupService->findOrCreate($validated);

            // Log the creation
            $this->auditService->logGroupCreated(
                Auth::id(),
                $group->id,
                $validated
            );

            return response()->json([
                'message' => 'Fiscal profile group created successfully',
                'group' => $group,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create fiscal profile group',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get employees currently assigned to a fiscal profile group.
     * GET /api/fiscal-profile-groups/{id}/employees
     */
    public function employees(string $id): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $employees = $this->groupService->getEmployees($id);
        return response()->json($employees);
    }

    /**
     * Match fiscal profile group by attributes (for AI service).
     * GET /api/fiscal-profile-groups/match
     */
    public function match(Request $request): JsonResponse
    {
        // This endpoint is for AI service - no auth required (IP whitelisted)
        $validated = $request->validate([
            'gender' => 'required|in:male,female',
            'marital_status' => 'required|in:single,married,divorced,widowed',
            'children_count' => 'required|integer|min:0',
            'disabled_children_count' => 'nullable|integer|min:0',
            'student_non_scholarship_children_count' => 'nullable|integer|min:0',
        ]);

        $group = $this->groupService->deduplicationCheck($validated);

        if ($group) {
            return response()->json([
                'exists' => true,
                'group_id' => $group->id,
                'label' => $group->label,
            ]);
        }

        return response()->json(['exists' => false]);
    }

    /**
     * Search fiscal profile groups by label/name (for AI service).
     * GET /api/fiscal-profile-groups/search
     */
    public function search(Request $request): JsonResponse
    {
        // This endpoint is for AI service - no auth required (IP whitelisted)
        $validated = $request->validate([
            'label' => 'required|string',
        ]);

        $groups = $this->groupService->searchByLabel($validated['label']);

        return response()->json([
            'count' => $groups->count(),
            'groups' => $groups,
        ]);
    }

    /**
     * Update a fiscal profile group.
     * PUT /api/fiscal-profile-groups/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $group = $this->groupService->findById($id);

        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        $validated = $request->validate([
            'gender' => 'sometimes|required|in:male,female',
            'marital_status' => 'sometimes|required|in:single,married,divorced,widowed',
            'children_count' => 'sometimes|required|integer|min:0',
            'disabled_children_count' => 'sometimes|nullable|integer|min:0',
            'student_non_scholarship_children_count' => 'sometimes|nullable|integer|min:0',
            'label' => 'sometimes|required|string|max:255',
        ]);

        try {
            $group->update($validated);

            // Log the update
            $this->auditService->logGroupUpdated(
                Auth::id(),
                $group->id,
                $validated
            );

            return response()->json([
                'message' => 'Fiscal profile group updated successfully',
                'group' => $group->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update fiscal profile group',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Delete a fiscal profile group.
     * DELETE /api/fiscal-profile-groups/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $group = $this->groupService->findById($id);

        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        // Check if group has active assignments
        if ($group->assignments()->whereNull('effective_to')->exists()) {
            return response()->json([
                'message' => 'Cannot delete group with active assignments',
                'active_assignments_count' => $group->assignments()->whereNull('effective_to')->count(),
            ], 400);
        }

        try {
            $group->delete();

            // Log the deletion
            $this->auditService->logGroupDeleted(
                Auth::id(),
                $group->id
            );

            return response()->json([
                'message' => 'Fiscal profile group deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete fiscal profile group',
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}
