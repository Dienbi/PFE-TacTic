<?php

namespace App\Repositories\FiscalProfile;

use App\Models\PersonalInfoChangeRequest;
use Illuminate\Support\Str;

class PersonalInfoChangeRequestRepository
{
    public function create(array $data): PersonalInfoChangeRequest
    {
        return PersonalInfoChangeRequest::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            'employee_id' => $data['employee_id'],
            'requested_marital_status' => $data['requested_marital_status'] ?? null,
            'requested_children_count' => $data['requested_children_count'] ?? null,
            'requested_disabled_children_count' => $data['requested_disabled_children_count'] ?? null,
            'requested_student_children_count' => $data['requested_student_children_count'] ?? null,
            'computed_head_of_family_preview' => $data['computed_head_of_family_preview'] ?? false,
            'claimed_effective_date' => $data['claimed_effective_date'],
            'status' => $data['status'] ?? 'pending',
            'submitted_at' => $data['submitted_at'] ?? now(),
        ]);
    }

    public function findById(string $id): ?PersonalInfoChangeRequest
    {
        return PersonalInfoChangeRequest::with(['employee', 'documents', 'reviewedBy'])->find($id);
    }

    public function findByEmployee(int $employeeId): \Illuminate\Database\Eloquent\Collection
    {
        return PersonalInfoChangeRequest::where('employee_id', $employeeId)
            ->with(['documents', 'reviewedBy'])
            ->orderBy('submitted_at', 'desc')
            ->get();
    }

    public function findActiveForEmployee(int $employeeId): ?PersonalInfoChangeRequest
    {
        return PersonalInfoChangeRequest::forEmployee($employeeId)
            ->active()
            ->first();
    }

    public function getPending(int $page = 1, int $perPage = 15)
    {
        return PersonalInfoChangeRequest::with(['employee', 'documents'])
            ->pending()
            ->orderBy('submitted_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);
    }

    public function getByStatus(string $status, int $page = 1, int $perPage = 15)
    {
        return PersonalInfoChangeRequest::with(['employee', 'documents', 'reviewedBy'])
            ->where('status', $status)
            ->orderBy('submitted_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);
    }

    public function update(string $id, array $data): PersonalInfoChangeRequest
    {
        $request = $this->findById($id);
        $request->update($data);
        return $request->fresh();
    }

    public function delete(string $id): bool
    {
        return PersonalInfoChangeRequest::destroy($id);
    }
}
