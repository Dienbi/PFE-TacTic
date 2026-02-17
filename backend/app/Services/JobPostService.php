<?php

namespace App\Services;

use App\Enums\JobPostStatus;
use App\Events\NewJobPostEvent;
use App\Models\JobPost;
use App\Repositories\JobPostRepository;
use App\Repositories\CompetenceRepository;
use Illuminate\Database\Eloquent\Collection;

class JobPostService
{
    public function __construct(
        protected JobPostRepository $jobPostRepository,
        protected CompetenceRepository $competenceRepository
    ) {}

    public function getAll(): Collection
    {
        return $this->jobPostRepository->getAll();
    }

    public function getPublished(): Collection
    {
        return $this->jobPostRepository->getPublished();
    }

    public function getOpen(): Collection
    {
        return $this->jobPostRepository->getOpen();
    }

    public function getById(int $id): ?JobPost
    {
        return $this->jobPostRepository->findWithRelations($id);
    }

    public function getForEmployee(int $userId): Collection
    {
        return $this->jobPostRepository->getForEmployee($userId);
    }

    public function create(int $creatorId, array $data): JobPost|array
    {
        // Validate competences if provided
        if (!empty($data['competences'])) {
            foreach ($data['competences'] as $comp) {
                $competence = $this->competenceRepository->find($comp['competence_id']);
                if (!$competence) {
                    return ['error' => "Compétence ID {$comp['competence_id']} introuvable."];
                }

                if ($comp['niveau_requis'] < 1 || $comp['niveau_requis'] > 5) {
                    return ['error' => 'Le niveau requis doit être entre 1 et 5.'];
                }
            }
        }

        // Create the job post
        $jobPost = $this->jobPostRepository->create([
            'job_request_id' => $data['job_request_id'] ?? null,
            'titre' => $data['titre'],
            'description' => $data['description'],
            'statut' => JobPostStatus::DRAFT,
            'created_by' => $creatorId,
        ]);

        // Attach competences if provided
        if (!empty($data['competences'])) {
            $this->jobPostRepository->attachCompetences($jobPost->id, $data['competences']);
        }

        // Log activity
        ActivityLogger::log(
            'JOB_POST_CREATED',
            "Poste créé: {$data['titre']}",
            $creatorId
        );

        return $jobPost;
    }

    public function update(int $id, array $data): bool|array
    {
        $jobPost = $this->jobPostRepository->findOrFail($id);

        // Cannot update closed posts
        if ($jobPost->isClosed()) {
            return ['error' => 'Les postes fermés ne peuvent pas être modifiés.'];
        }

        // Validate competences if provided
        if (isset($data['competences'])) {
            foreach ($data['competences'] as $comp) {
                $competence = $this->competenceRepository->find($comp['competence_id']);
                if (!$competence) {
                    return ['error' => "Compétence ID {$comp['competence_id']} introuvable."];
                }

                if ($comp['niveau_requis'] < 1 || $comp['niveau_requis'] > 5) {
                    return ['error' => 'Le niveau requis doit être entre 1 et 5.'];
                }
            }
        }

        // Update the job post
        $updateData = [];
        if (isset($data['titre'])) $updateData['titre'] = $data['titre'];
        if (isset($data['description'])) $updateData['description'] = $data['description'];

        $success = $this->jobPostRepository->update($id, $updateData);

        // Update competences if provided
        if ($success && isset($data['competences'])) {
            $this->jobPostRepository->attachCompetences($id, $data['competences']);
        }

        return $success;
    }

    public function publish(int $id, int $publishedById): bool|array
    {
        $jobPost = $this->jobPostRepository->findWithRelations($id);

        if (!$jobPost) {
            return ['error' => 'Poste introuvable.'];
        }

        if (!$jobPost->isDraft()) {
            return ['error' => 'Seuls les brouillons peuvent être publiés.'];
        }

        // Publish the post
        $success = $jobPost->publish();

        if ($success) {
            // Log activity
            ActivityLogger::log(
                'JOB_POST_PUBLISHED',
                "Poste publié: {$jobPost->titre}",
                $publishedById
            );

            // Broadcast event to all employees
            try {
                event(new NewJobPostEvent(
                    jobPostId: $jobPost->id,
                    titre: $jobPost->titre,
                    description: substr($jobPost->description, 0, 100)
                ));
            } catch (\Exception $e) {
                \Log::warning('Broadcast failed for NewJobPostEvent: ' . $e->getMessage());
            }
        }

        return $success;
    }

    public function close(int $id, int $closedById): bool|array
    {
        $jobPost = $this->jobPostRepository->findOrFail($id);

        if (!$jobPost->isPublished()) {
            return ['error' => 'Seuls les postes publiés peuvent être fermés.'];
        }

        // Close the post
        $success = $jobPost->close();

        if ($success) {
            // Log activity
            ActivityLogger::log(
                'JOB_POST_CLOSED',
                "Poste fermé: {$jobPost->titre}",
                $closedById
            );
        }

        return $success;
    }

    public function delete(int $id): bool|array
    {
        $jobPost = $this->jobPostRepository->findOrFail($id);

        // Cannot delete published posts with applications
        if ($jobPost->isPublished() && $jobPost->applications()->exists()) {
            return ['error' => 'Impossible de supprimer un poste avec des candidatures.'];
        }

        return $this->jobPostRepository->delete($id);
    }

    public function countOpen(): int
    {
        return $this->jobPostRepository->countOpen();
    }
}
