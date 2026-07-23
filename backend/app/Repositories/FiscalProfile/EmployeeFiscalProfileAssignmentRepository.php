<?php

namespace App\Repositories\FiscalProfile;

use App\Models\EmployeeFiscalProfileAssignment;
use Illuminate\Support\Str;

class EmployeeFiscalProfileAssignmentRepository
{
    public function create(array $data): EmployeeFiscalProfileAssignment
    {
        return EmployeeFiscalProfileAssignment::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            'employee_id' => $data['employee_id'],
            'fiscal_profile_group_id' => $data['fiscal_profile_group_id'],
            'effective_from' => $data['effective_from'],
            'effective_to' => $data['effective_to'] ?? null,
            'source_change_request_id' => $data['source_change_request_id'] ?? null,
            'assigned_by' => $data['assigned_by'],
            'assigned_at' => $data['assigned_at'] ?? now(),
        ]);
    }

    public function findById(string $id): ?EmployeeFiscalProfileAssignment
    {
        return EmployeeFiscalProfileAssignment::with(['employee', 'fiscalProfileGroup', 'assignedBy', 'sourceChangeRequest'])->find($id);
    }

    public function findByEmployee(int $employeeId): \Illuminate\Database\Eloquent\Collection
    {
        return EmployeeFiscalProfileAssignment::where('employee_id', $employeeId)
            ->with(['fiscalProfileGroup', 'assignedBy', 'sourceChangeRequest'])
            ->orderBy('effective_from', 'desc')
            ->get();
    }

    public function findCurrentForEmployee(int $employeeId): ?EmployeeFiscalProfileAssignment
    {
        return EmployeeFiscalProfileAssignment::forEmployee($employeeId)
            ->current()
            ->with('fiscalProfileGroup')
            ->first();
    }

    public function findEffectiveForDate(int $employeeId, string $date): ?EmployeeFiscalProfileAssignment
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

    public function update(string $id, array $data): EmployeeFiscalProfileAssignment
    {
        $assignment = $this->findById($id);
        $assignment->update($data);
        return $assignment->fresh();
    }

    public function closeAssignment(string $id, string $effectiveTo): EmployeeFiscalProfileAssignment
    {
        return $this->update($id, ['effective_to' => $effectiveTo]);
    }

    public function delete(string $id): bool
    {
        return EmployeeFiscalProfileAssignment::destroy($id);
    }

    public function deleteByEmployee(int $employeeId): int
    {
        return EmployeeFiscalProfileAssignment::where('employee_id', $employeeId)->delete();
    }
}
