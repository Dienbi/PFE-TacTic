<?php

namespace App\Repositories;

use App\Enums\JobRequestStatus;
use App\Models\JobRequest;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class JobRequestRepository extends BaseRepository
{
    public function __construct(JobRequest $model)
    {
        parent::__construct($model);
    }

    public function getPending(): Collection
    {
        return $this->model->pending()->with(['demandeur', 'equipe'])->get();
    }

    public function getPendingPaginated(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->pending()
                          ->with(['demandeur', 'equipe'])
                          ->orderBy('created_at', 'desc')
                          ->paginate($perPage);
    }

    public function getByDemandeur(int $userId): Collection
    {
        return $this->model->forDemandeur($userId)
                          ->with(['equipe'])
                          ->orderBy('created_at', 'desc')
                          ->get();
    }

    public function getByEquipe(int $equipeId): Collection
    {
        return $this->model->forEquipe($equipeId)
                          ->with(['demandeur'])
                          ->orderBy('created_at', 'desc')
                          ->get();
    }

    public function getAll(): Collection
    {
        return $this->model->with(['demandeur', 'equipe'])
                          ->orderBy('created_at', 'desc')
                          ->get();
    }

    public function getAllPaginated(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->with(['demandeur', 'equipe'])
                          ->orderBy('created_at', 'desc')
                          ->paginate($perPage);
    }

    public function getApproved(): Collection
    {
        return $this->model->approved()
                          ->with(['demandeur', 'equipe'])
                          ->orderBy('updated_at', 'desc')
                          ->get();
    }

    public function getRejected(): Collection
    {
        return $this->model->rejected()
                          ->with(['demandeur', 'equipe'])
                          ->orderBy('updated_at', 'desc')
                          ->get();
    }

    public function getByStatus(JobRequestStatus $status): Collection
    {
        return $this->model->where('statut', $status)
                          ->with(['demandeur', 'equipe'])
                          ->orderBy('created_at', 'desc')
                          ->get();
    }

    public function findWithRelations(int $id): ?JobRequest
    {
        return $this->model->with(['demandeur', 'equipe', 'jobPost'])
                          ->find($id);
    }

    public function countPending(): int
    {
        return $this->model->pending()->count();
    }

    public function countByStatus(JobRequestStatus $status): int
    {
        return $this->model->where('statut', $status)->count();
    }
}
