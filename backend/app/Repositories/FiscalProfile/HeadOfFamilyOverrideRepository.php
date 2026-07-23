<?php

namespace App\Repositories\FiscalProfile;

use App\Models\HeadOfFamilyOverride;
use Illuminate\Support\Str;

class HeadOfFamilyOverrideRepository
{
    public function create(array $data): HeadOfFamilyOverride
    {
        return HeadOfFamilyOverride::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            'employee_id' => $data['employee_id'],
            'overridden_value' => $data['overridden_value'],
            'justification_note' => $data['justification_note'],
            'document_file_path' => $data['document_file_path'] ?? null,
            'approved_by' => $data['approved_by'],
            'approved_at' => $data['approved_at'] ?? now(),
        ]);
    }

    public function findById(string $id): ?HeadOfFamilyOverride
    {
        return HeadOfFamilyOverride::with(['employee', 'approvedBy'])->find($id);
    }

    public function findByEmployee(int $employeeId): \Illuminate\Database\Eloquent\Collection
    {
        return HeadOfFamilyOverride::where('employee_id', $employeeId)
            ->with(['approvedBy'])
            ->orderBy('approved_at', 'desc')
            ->get();
    }

    public function findActiveForEmployee(int $employeeId): ?HeadOfFamilyOverride
    {
        return HeadOfFamilyOverride::forEmployee($employeeId)
            ->active()
            ->first();
    }

    public function update(string $id, array $data): HeadOfFamilyOverride
    {
        $override = $this->findById($id);
        $override->update($data);
        return $override->fresh();
    }

    public function delete(string $id): bool
    {
        return HeadOfFamilyOverride::destroy($id);
    }

    public function deleteByEmployee(int $employeeId): int
    {
        return HeadOfFamilyOverride::where('employee_id', $employeeId)->delete();
    }
}
