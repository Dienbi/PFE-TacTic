<?php

namespace App\Repositories;

use App\Enums\JobPostStatus;
use App\Models\JobPost;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class JobPostRepository extends BaseRepository
{
    public function __construct(JobPost $model)
    {
        parent::__construct($model);
    }

    public function getPublished(): Collection
    {
        return $this->model->published()
                          ->withCount('applications')
                          ->with(['createdBy', 'competences'])
                          ->orderBy('published_at', 'desc')
                          ->get();
    }

    public function getPublishedPaginated(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->published()
                          ->with(['createdBy', 'competences'])
                          ->orderBy('published_at', 'desc')
                          ->paginate($perPage);
    }

    public function getOpen(): Collection
    {
        return $this->model->open()
                          ->withCount('applications')
                          ->with(['createdBy', 'competences'])
                          ->orderBy('published_at', 'desc')
                          ->get();
    }

    public function getOpenPaginated(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->open()
                          ->with(['createdBy', 'competences'])
                          ->orderBy('published_at', 'desc')
                          ->paginate($perPage);
    }

    public function getDrafts(): Collection
    {
        return $this->model->draft()
                          ->with(['createdBy', 'competences'])
                          ->orderBy('created_at', 'desc')
                          ->get();
    }

    public function getClosed(): Collection
    {
        return $this->model->closed()
                          ->with(['createdBy', 'competences'])
                          ->orderBy('closed_at', 'desc')
                          ->get();
    }

    public function getAll(): Collection
    {
        return $this->model->withCount('applications')
                          ->with(['createdBy', 'competences', 'jobRequest'])
                          ->orderBy('created_at', 'desc')
                          ->get();
    }

    public function getAllPaginated(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->with(['createdBy', 'competences', 'jobRequest'])
                          ->orderBy('created_at', 'desc')
                          ->paginate($perPage);
    }

    public function findWithRelations(int $id): ?JobPost
    {
        return $this->model->with([
            'createdBy',
            'competences',
            'jobRequest.demandeur',
            'jobRequest.equipe',
            'applications.utilisateur',
        ])->find($id);
    }

    public function getWithApplicationCount(): Collection
    {
        return $this->model->withCount('applications')
                          ->with(['createdBy', 'competences'])
                          ->orderBy('created_at', 'desc')
                          ->get();
    }

    public function getForEmployee(int $userId): Collection
    {
        return $this->model->published()
                          ->whereDoesntHave('applications', function ($query) use ($userId) {
                              $query->where('utilisateur_id', $userId)
                                    ->whereNotIn('statut', ['retiree']);
                          })
                          ->withCount('applications')
                          ->with(['createdBy', 'competences'])
                          ->orderBy('published_at', 'desc')
                          ->get();
    }

    public function getForEmployeePaginated(int $userId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->published()
                          ->whereDoesntHave('applications', function ($query) use ($userId) {
                              $query->where('utilisateur_id', $userId)
                                    ->whereNotIn('statut', ['retiree']);
                          })
                          ->with(['createdBy', 'competences'])
                          ->orderBy('published_at', 'desc')
                          ->paginate($perPage);
    }

    public function getByCreator(int $userId): Collection
    {
        return $this->model->where('created_by', $userId)
                          ->with(['competences'])
                          ->orderBy('created_at', 'desc')
                          ->get();
    }

    public function getByStatus(JobPostStatus $status): Collection
    {
        return $this->model->where('statut', $status)
                          ->with(['createdBy', 'competences'])
                          ->orderBy('created_at', 'desc')
                          ->get();
    }

    public function countByStatus(JobPostStatus $status): int
    {
        return $this->model->where('statut', $status)->count();
    }

    public function countOpen(): int
    {
        return $this->model->open()->count();
    }

    public function attachCompetences(int $jobPostId, array $competences): void
    {
        $jobPost = $this->findOrFail($jobPostId);
        $syncData = [];

        foreach ($competences as $competence) {
            $syncData[$competence['competence_id']] = [
                'niveau_requis' => $competence['niveau_requis']
            ];
        }

        $jobPost->competences()->sync($syncData);
    }
}
