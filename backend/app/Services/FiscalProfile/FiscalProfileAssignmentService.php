<?php

namespace App\Services\FiscalProfile;

use App\Models\EmployeeFiscalProfileAssignment;
use App\Models\FiscalProfileGroup;
use App\Services\FiscalProfile\FiscalProfileGroupService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * FiscalProfileAssignmentService
 *
 * Single Responsibility: Manage employee fiscal profile assignments including
 * creation, closure of previous assignments, and bulk operations.
 */
class FiscalProfileAssignmentService
{
    private FiscalProfileGroupService $groupService;

    public function __construct(FiscalProfileGroupService $groupService)
    {
        $this->groupService = $groupService;
    }

    /**
     * Assign a fiscal profile to an employee.
     * Closes the previous assignment if one exists.
     *
     * @param string $employeeId
     * @param array $groupAttributes
     * @param string $effectiveFrom
     * @param string $assignedBy
     * @return EmployeeFiscalProfileAssignment
     */
    public function assignProfile(
        string $employeeId,
        array $groupAttributes,
        string $effectiveFrom,
        string $assignedBy
    ): EmployeeFiscalProfileAssignment {
        // Find or create the fiscal profile group
        $group = $this->groupService->findOrCreate($groupAttributes);

        DB::beginTransaction();
        try {
            // Close previous assignment if exists
            $this->closePreviousAssignment($employeeId, $effectiveFrom);

            // Create new assignment
            $assignment = EmployeeFiscalProfileAssignment::create([
                'id' => (string) Str::uuid(),
                'employee_id' => $employeeId,
                'fiscal_profile_group_id' => $group->id,
                'effective_from' => $effectiveFrom,
                'effective_to' => null,
                'assigned_by' => $assignedBy,
                'assigned_at' => now(),
            ]);

            DB::commit();
            return $assignment->fresh(['fiscalProfileGroup']);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Close the previous assignment for an employee.
     * Sets effective_to to the day before the new effective date, or same day if same day.
     *
     * @param string $employeeId
     * @param string $newEffectiveFrom
     * @return void
     */
    public function closePreviousAssignment(string $employeeId, string $newEffectiveFrom): void
    {
        $previousAssignment = EmployeeFiscalProfileAssignment::forEmployee($employeeId)
            ->current()
            ->first();

        if ($previousAssignment) {
            $newEffectiveDate = \Carbon\Carbon::parse($newEffectiveFrom);
            $previousEffectiveDate = \Carbon\Carbon::parse($previousAssignment->effective_from);

            // If same day, set effective_to to same day (end of day)
            if ($newEffectiveDate->isSameDay($previousEffectiveDate)) {
                $previousAssignment->update([
                    'effective_to' => $newEffectiveDate->toDateString(),
                ]);
            } else {
                // Otherwise set to day before
                $previousAssignment->update([
                    'effective_to' => $newEffectiveDate->subDay()->toDateString(),
                ]);
            }
        }
    }

    /**
     * Get the effective fiscal profile for an employee on a specific date.
     *
     * @param string $employeeId
     * @param string $date
     * @return EmployeeFiscalProfileAssignment|null
     */
    public function getEffectiveProfile(string $employeeId, string $date): ?EmployeeFiscalProfileAssignment
    {
        return EmployeeFiscalProfileAssignment::forEmployee($employeeId)
            ->where('effective_from', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $date);
            })
            ->with('fiscalProfileGroup')
            ->first();
    }

    /**
     * Get the current fiscal profile for an employee.
     *
     * @param string $employeeId
     * @return EmployeeFiscalProfileAssignment|null
     */
    public function getCurrentProfile(string $employeeId): ?EmployeeFiscalProfileAssignment
    {
        return EmployeeFiscalProfileAssignment::forEmployee($employeeId)
            ->current()
            ->with('fiscalProfileGroup')
            ->first();
    }

    /**
     * Get the fiscal history for an employee.
     *
     * @param string $employeeId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getEmployeeHistory(string $employeeId)
    {
        return EmployeeFiscalProfileAssignment::forEmployee($employeeId)
            ->with(['fiscalProfileGroup', 'assignedBy'])
            ->orderBy('effective_from', 'desc')
            ->get();
    }

    /**
     * Bulk assign fiscal profiles to multiple employees.
     *
     * @param array $employeeIds
     * @param string $groupId
     * @param string $effectiveFrom
     * @param string $assignedBy
     * @return array Array of created assignment IDs
     */
    public function bulkAssign(
        array $employeeIds,
        string $groupId,
        string $effectiveFrom,
        string $assignedBy
    ): array {
        $group = FiscalProfileGroup::findOrFail($groupId);
        $groupAttributes = [
            'gender' => $group->gender,
            'marital_status' => $group->marital_status,
            'children_count' => $group->children_count,
            'disabled_children_count' => $group->disabled_children_count,
            'student_non_scholarship_children_count' => $group->student_non_scholarship_children_count,
        ];

        $assignmentIds = [];

        DB::beginTransaction();
        try {
            foreach ($employeeIds as $employeeId) {
                $assignment = $this->assignProfile(
                    $employeeId,
                    $groupAttributes,
                    $effectiveFrom,
                    $assignedBy
                );
                $assignmentIds[] = $assignment->id;
            }

            DB::commit();
            return $assignmentIds;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Find employees matching specific fiscal criteria.
     * Used by AI service for bulk assignment proposals.
     *
     * @param array $criteria
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function findMatchingEmployees(array $criteria)
    {
        $query = \App\Models\Utilisateur::query();
        $query->where('actif', true);

        // Filter by gender if provided (direct field on utilisateurs table)
        if (isset($criteria['gender'])) {
            $query->where('gender', $criteria['gender']);
        }

        // Filter by marital_status if provided (direct field on utilisateurs table)
        if (isset($criteria['marital_status'])) {
            $query->where('marital_status', $criteria['marital_status']);
        }

        // Filter by children_count if provided (direct field on utilisateurs table)
        if (isset($criteria['children_count'])) {
            $query->where('children_count', $criteria['children_count']);
        }

        $employees = $query->get();

        return $employees->map(function ($employee) {
            return [
                'id' => $employee->id,
                'nom' => $employee->nom,
                'prenom' => $employee->prenom,
                'matricule' => $employee->matricule,
                'current_fiscal_profile_group_id' => null,
                'current_fiscal_profile_label' => null,
            ];
        });
    }
}
