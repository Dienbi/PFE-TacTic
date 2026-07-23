<?php

namespace App\Repositories\Payroll;

use App\Models\EmployeeFiscalProfile;
use Illuminate\Support\Str;

class EmployeeFiscalProfileRepository
{
    public function create(array $data): EmployeeFiscalProfile
    {
        return EmployeeFiscalProfile::create([
            'id' => $data['id'] ?? Str::uuid(),
            'employee_id' => $data['employee_id'],
            'effective_from' => $data['effective_from'],
            'marital_status' => $data['marital_status'] ?? 'single',
            'children_count' => $data['children_count'] ?? 0,
            'disabled_children_count' => $data['disabled_children_count'] ?? 0,
            'student_non_scholarship_children_count' => $data['student_non_scholarship_children_count'] ?? 0,
        ]);
    }

    public function update(string $id, array $data): EmployeeFiscalProfile
    {
        $profile = $this->findById($id);
        $profile->update($data);
        return $profile->fresh();
    }

    public function findById(string $id): ?EmployeeFiscalProfile
    {
        return EmployeeFiscalProfile::find($id);
    }

    public function findEffectiveForDate(string $employeeId, string $date): ?EmployeeFiscalProfile
    {
        return EmployeeFiscalProfile::where('employee_id', $employeeId)
            ->effectiveForDate($date)
            ->first();
    }

    public function findByEmployee(string $employeeId): \Illuminate\Database\Eloquent\Collection
    {
        return EmployeeFiscalProfile::where('employee_id', $employeeId)
            ->orderBy('effective_from', 'desc')
            ->get();
    }

    public function delete(string $id): bool
    {
        return EmployeeFiscalProfile::destroy($id);
    }

    public function deleteByEmployee(string $employeeId): int
    {
        return EmployeeFiscalProfile::where('employee_id', $employeeId)->delete();
    }
}
