<?php

namespace App\Repositories;

use App\Models\PersonalInfoChangeRequest;
use Illuminate\Database\Eloquent\Collection;

class PersonalInfoChangeRequestRepository extends BaseRepository
{
    public function __construct(PersonalInfoChangeRequest $model)
    {
        parent::__construct($model);
    }

    public function getByEmployee(int $employeeId): Collection
    {
        return $this->model->where('employee_id', $employeeId)
            ->with('documents')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getActiveForEmployee(int $employeeId): ?PersonalInfoChangeRequest
    {
        return $this->model->where('employee_id', $employeeId)
            ->active()
            ->with('documents')
            ->first();
    }

    public function getPendingForHR(): Collection
    {
        return $this->model->pending()
            ->with(['employee:id,nom,prenom,email,matricule,gender,marital_status,children_count', 'documents'])
            ->orderBy('created_at', 'asc')
            ->get();
    }

    public function getNeedsMoreInfoForHR(): Collection
    {
        return $this->model->needsMoreInfo()
            ->with(['employee:id,nom,prenom,email,matricule,gender,marital_status,children_count', 'documents'])
            ->orderBy('created_at', 'asc')
            ->get();
    }

    public function updateStatus(string $id, string $status, int $reviewedBy, ?string $reviewNotes = null): bool
    {
        $record = $this->model->find($id);
        if (!$record) {
            return false;
        }
        return $record->update([
            'status' => $status,
            'reviewed_by' => $reviewedBy,
            'reviewed_at' => now(),
            'review_notes' => $reviewNotes,
        ]);
    }

    public function markAsAffectsLockedPayslips(string $id): bool
    {
        $record = $this->model->find($id);
        if (!$record) {
            return false;
        }
        return $record->update(['affects_locked_payslips' => true]);
    }

    public function findByUuid(string $id): ?PersonalInfoChangeRequest
    {
        return $this->model->find($id);
    }
}
