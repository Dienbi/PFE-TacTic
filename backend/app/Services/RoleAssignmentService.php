<?php

namespace App\Services;

use App\Repositories\EmployeeRoleAssignmentRepository;
use App\Models\Utilisateur;
use Illuminate\Support\Facades\Auth;

class RoleAssignmentService
{
    public function __construct(
        protected EmployeeRoleAssignmentRepository $assignmentRepository
    ) {}

    public function assignEmployee($employeeId, $roleProfileId, $effectiveFrom, $assignedBy = null)
    {
        $assignedBy = $assignedBy ?? Auth::id();

        $data = [
            'employee_id' => $employeeId,
            'role_profile_id' => $roleProfileId,
            'effective_from' => $effectiveFrom,
            'assigned_by' => $assignedBy,
        ];

        try {
            return $this->assignmentRepository->create($data);
        } catch (\Exception $e) {
            // Log the error and rethrow
            \Log::error('Role assignment failed', [
                'employee_id' => $employeeId,
                'role_profile_id' => $roleProfileId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function reassignEmployee($employeeId, $roleProfileId, $effectiveFrom, $assignedBy = null)
    {
        // Reassign is the same as assign - the repository handles closing the previous assignment
        return $this->assignEmployee($employeeId, $roleProfileId, $effectiveFrom, $assignedBy);
    }

    public function getCurrentAssignment($employeeId)
    {
        return $this->assignmentRepository->findCurrentForEmployee($employeeId);
    }

    public function getAssignmentHistory($employeeId)
    {
        return $this->assignmentRepository->getHistory($employeeId);
    }

    public function bulkAssign(array $assignments, $assignedBy = null)
    {
        $assignedBy = $assignedBy ?? Auth::id();

        $assignmentData = array_map(function ($item) use ($assignedBy) {
            return [
                'employee_id' => $item['employee_id'],
                'role_profile_id' => $item['role_profile_id'],
                'effective_from' => $item['effective_from'],
                'assigned_by' => $assignedBy,
            ];
        }, $assignments);

        return $this->assignmentRepository->bulkCreate($assignmentData);
    }

    public function closeAssignment($assignmentId, $effectiveTo)
    {
        return $this->assignmentRepository->closeAssignment($assignmentId, $effectiveTo);
    }
}
