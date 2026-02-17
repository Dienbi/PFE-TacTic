<?php

namespace App\Repositories;

use App\Enums\ApplicationStatus;
use App\Models\JobApplication;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class JobApplicationRepository extends BaseRepository
{
    public function __construct(JobApplication $model)
    {
        parent::__construct($model);
    }

    public function getByJobPost(int $jobPostId): Collection
    {
        return $this->model->forJobPost($jobPostId)
                          ->with(['utilisateur', 'reviewer'])
                          ->orderBy('applied_at', 'desc')
                          ->get();
    }

    public function getByJobPostPaginated(int $jobPostId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->forJobPost($jobPostId)
                          ->with(['utilisateur', 'reviewer'])
                          ->orderBy('applied_at', 'desc')
                          ->paginate($perPage);
    }

    public function getByUser(int $userId): Collection
    {
        return $this->model->forUser($userId)
                          ->with(['jobPost.competences', 'reviewer'])
                          ->orderBy('applied_at', 'desc')
                          ->get();
    }

    public function getByUserPaginated(int $userId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->forUser($userId)
                          ->with(['jobPost.competences', 'reviewer'])
                          ->orderBy('applied_at', 'desc')
                          ->paginate($perPage);
    }

    public function getPending(): Collection
    {
        return $this->model->pending()
                          ->with(['jobPost', 'utilisateur'])
                          ->orderBy('applied_at', 'asc')
                          ->get();
    }

    public function getPendingPaginated(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->pending()
                          ->with(['jobPost', 'utilisateur'])
                          ->orderBy('applied_at', 'asc')
                          ->paginate($perPage);
    }

    public function getPendingForHR(): Collection
    {
        return $this->model->pending()
                          ->with(['jobPost.competences', 'utilisateur.competences'])
                          ->orderBy('applied_at', 'asc')
                          ->get();
    }

    public function existsForUserAndPost(int $userId, int $jobPostId): bool
    {
        return $this->model->where('utilisateur_id', $userId)
                          ->where('job_post_id', $jobPostId)
                          ->whereNotIn('statut', [ApplicationStatus::WITHDRAWN])
                          ->exists();
    }

    public function findByUserAndPost(int $userId, int $jobPostId): ?JobApplication
    {
        return $this->model->where('utilisateur_id', $userId)
                          ->where('job_post_id', $jobPostId)
                          ->first();
    }

    public function findWithRelations(int $id): ?JobApplication
    {
        return $this->model->with([
            'jobPost.competences',
            'utilisateur.competences',
            'utilisateur.equipe',
            'reviewer'
        ])->find($id);
    }

    public function getByStatus(ApplicationStatus $status): Collection
    {
        return $this->model->where('statut', $status)
                          ->with(['jobPost', 'utilisateur'])
                          ->orderBy('applied_at', 'desc')
                          ->get();
    }

    public function countByStatus(ApplicationStatus $status): int
    {
        return $this->model->where('statut', $status)->count();
    }

    public function countPending(): int
    {
        return $this->model->pending()->count();
    }

    public function countForUser(int $userId): int
    {
        return $this->model->forUser($userId)->count();
    }

    public function countForJobPost(int $jobPostId): int
    {
        return $this->model->forJobPost($jobPostId)->count();
    }

    public function getRecentApplications(int $limit = 10): Collection
    {
        return $this->model->with(['jobPost', 'utilisateur'])
                          ->orderBy('applied_at', 'desc')
                          ->limit($limit)
                          ->get();
    }
}
