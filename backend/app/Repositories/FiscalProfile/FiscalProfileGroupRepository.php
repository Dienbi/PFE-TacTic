<?php

namespace App\Repositories\FiscalProfile;

use App\Models\FiscalProfileGroup;
use Illuminate\Support\Str;

class FiscalProfileGroupRepository
{
    public function create(array $data): FiscalProfileGroup
    {
        return FiscalProfileGroup::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            'gender' => $data['gender'],
            'marital_status' => $data['marital_status'],
            'head_of_family' => $data['head_of_family'],
            'children_count' => $data['children_count'],
            'disabled_children_count' => $data['disabled_children_count'] ?? 0,
            'student_non_scholarship_children_count' => $data['student_non_scholarship_children_count'] ?? 0,
            'label' => $data['label'],
        ]);
    }

    public function findById(string $id): ?FiscalProfileGroup
    {
        return FiscalProfileGroup::with(['assignments', 'employees'])->find($id);
    }

    public function findByAttributes(array $attributes): ?FiscalProfileGroup
    {
        return FiscalProfileGroup::where('gender', $attributes['gender'])
            ->where('marital_status', $attributes['marital_status'])
            ->where('children_count', $attributes['children_count'] ?? 0)
            ->where('disabled_children_count', $attributes['disabled_children_count'] ?? 0)
            ->where('student_non_scholarship_children_count', $attributes['student_non_scholarship_children_count'] ?? 0)
            ->first();
    }

    public function getAll(): \Illuminate\Database\Eloquent\Collection
    {
        return FiscalProfileGroup::orderBy('label')->get();
    }

    public function update(string $id, array $data): FiscalProfileGroup
    {
        $group = $this->findById($id);
        $group->update($data);
        return $group->fresh();
    }

    public function delete(string $id): bool
    {
        return FiscalProfileGroup::destroy($id);
    }

    public function getEmployees(string $groupId): \Illuminate\Database\Eloquent\Collection
    {
        $group = $this->findById($groupId);
        if (!$group) {
            return collect();
        }

        return $group->employees()->whereNull('employee_fiscal_profile_assignments.effective_to')->get();
    }
}
