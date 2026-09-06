<?php

namespace App\Services;

use App\Repositories\RoleProfileRepository;
use App\Repositories\EmployeeRoleAssignmentRepository;
use Illuminate\Support\Str;

class RoleProfileService
{
    public function __construct(
        protected RoleProfileRepository $roleProfileRepository,
        protected EmployeeRoleAssignmentRepository $assignmentRepository
    ) {}

    public function findOrCreate(array $data)
    {
        // Check for duplicate by name
        $existing = $this->roleProfileRepository->findByName($data['name']);
        if ($existing) {
            return $existing;
        }

        return $this->roleProfileRepository->create($data);
    }

    public function deduplicationCheck(array $data): ?array
    {
        $existing = $this->roleProfileRepository->findByName($data['name']);
        if ($existing) {
            return [
                'exists' => true,
                'profile' => $existing,
                'message' => 'A role profile with this name already exists'
            ];
        }

        return null;
    }

    private function generateLabel(array $data): string
    {
        $name = $data['name'] ?? '';
        $horaireType = $data['horaire_type'] ?? '';
        $salaryType = $data['salary_type'] ?? '';
        $weeklyHours = $data['weekly_hours'] ?? null;

        $label = "{$name} · {$horaireType} · {$salaryType}";
        if ($weeklyHours) {
            $label .= " · {$weeklyHours}h";
        }

        return $label;
    }

    public function getAll()
    {
        return $this->roleProfileRepository->all();
    }

    public function findById($id)
    {
        return $this->roleProfileRepository->find($id);
    }

    public function getEmployees($id)
    {
        return $this->roleProfileRepository->getEmployees($id);
    }

    public function searchByName($query)
    {
        return $this->roleProfileRepository->search($query);
    }

    public function create(array $data)
    {
        // Check for duplicates
        $duplicate = $this->deduplicationCheck($data);
        if ($duplicate) {
            throw new \Exception($duplicate['message']);
        }

        return $this->roleProfileRepository->create($data);
    }

    public function update($id, array $data)
    {
        // If name is being changed, check for duplicates
        if (isset($data['name'])) {
            $existing = $this->roleProfileRepository->findByName($data['name']);
            if ($existing && $existing->id !== $id) {
                throw new \Exception('A role profile with this name already exists');
            }
        }

        return $this->roleProfileRepository->update($id, $data);
    }

    public function delete($id)
    {
        // Check if profile has active assignments
        $employees = $this->getEmployees($id);
        if ($employees && $employees->count() > 0) {
            throw new \Exception('Cannot delete role profile with active employee assignments');
        }

        return $this->roleProfileRepository->delete($id);
    }
}
