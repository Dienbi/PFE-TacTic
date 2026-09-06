<?php

namespace App\Repositories;

use App\Models\EmployeeRoleAssignment;
use App\Models\Utilisateur;
use Illuminate\Support\Str;

class EmployeeRoleAssignmentRepository
{
    public function findCurrentForEmployee($employeeId)
    {
        return EmployeeRoleAssignment::forEmployee($employeeId)
            ->current()
            ->with('roleProfile', 'assignedBy')
            ->first();
    }

    public function findEffectiveForDate($employeeId, $date)
    {
        return EmployeeRoleAssignment::forEmployee($employeeId)
            ->activeForDate($date)
            ->with('roleProfile', 'assignedBy')
            ->first();
    }

    public function getHistory($employeeId)
    {
        return EmployeeRoleAssignment::forEmployee($employeeId)
            ->with('roleProfile', 'assignedBy')
            ->orderBy('effective_from', 'desc')
            ->get();
    }

    public function create(array $data)
    {
        $data['id'] = (string) Str::uuid();
        $data['assigned_at'] = now();

        // Close any existing current assignment
        if (isset($data['employee_id'])) {
            $this->closeCurrentAssignment($data['employee_id'], $data['effective_from']);
        }

        $assignment = EmployeeRoleAssignment::create($data);

        // Update employee's role_profile_id pointer
        $employee = Utilisateur::find($data['employee_id']);
        if ($employee) {
            $employee->role_profile_id = $data['role_profile_id'];
            $employee->save();
        }

        return $assignment->fresh();
    }

    public function closeAssignment($assignmentId, $effectiveTo)
    {
        $assignment = EmployeeRoleAssignment::findOrFail($assignmentId);
        $assignment->effective_to = $effectiveTo;
        $assignment->save();
        return $assignment;
    }

    public function closeCurrentAssignment($employeeId, $newEffectiveFrom)
    {
        $current = $this->findCurrentForEmployee($employeeId);
        if ($current) {
            $current->effective_to = date('Y-m-d', strtotime($newEffectiveFrom . ' -1 day'));
            $current->save();
        }
    }

    public function bulkCreate(array $assignments)
    {
        $created = [];
        foreach ($assignments as $data) {
            $data['id'] = (string) Str::uuid();
            $data['assigned_at'] = now();

            $this->closeCurrentAssignment($data['employee_id'], $data['effective_from']);
            $assignment = EmployeeRoleAssignment::create($data);

            // Update employee's role_profile_id pointer
            $employee = Utilisateur::find($data['employee_id']);
            if ($employee) {
                $employee->role_profile_id = $data['role_profile_id'];
                $employee->save();
            }

            $created[] = $assignment->fresh();
        }

        return $created;
    }
}
