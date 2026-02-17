<?php

namespace App\Services;

use App\Enums\ApplicationStatus;
use App\Enums\EmployeStatus;
use App\Enums\JobPostStatus;
use App\Enums\Role;
use App\Events\NewApplicationEvent;
use App\Models\JobApplication;
use App\Repositories\JobApplicationRepository;
use App\Repositories\JobPostRepository;
use App\Repositories\UtilisateurRepository;
use Illuminate\Database\Eloquent\Collection;

class JobApplicationService
{
    public function __construct(
        protected JobApplicationRepository $jobApplicationRepository,
        protected JobPostRepository $jobPostRepository,
        protected UtilisateurRepository $utilisateurRepository
    ) {}

    public function getAll(): Collection
    {
        return $this->jobApplicationRepository->getPending();
    }

    public function getById(int $id): ?JobApplication
    {
        return $this->jobApplicationRepository->findWithRelations($id);
    }

    public function getByUser(int $userId): Collection
    {
        return $this->jobApplicationRepository->getByUser($userId);
    }

    public function getByJobPost(int $jobPostId): Collection
    {
        return $this->jobApplicationRepository->getByJobPost($jobPostId);
    }

    public function apply(int $userId, array $data): JobApplication|array
    {
        // Validate user is an employee
        $user = $this->utilisateurRepository->findOrFail($userId);

        if (!$user->isEmploye()) {
            return ['error' => 'Seuls les employés peuvent postuler à un poste.'];
        }

        // Validate job post exists and is published
        $jobPost = $this->jobPostRepository->findOrFail($data['job_post_id']);

        if (!$jobPost->isPublished()) {
            return ['error' => 'Ce poste n\'est pas disponible pour les candidatures.'];
        }

        if ($jobPost->isClosed()) {
            return ['error' => 'Ce poste est fermé.'];
        }

        // Check if user already applied
        if ($this->jobApplicationRepository->existsForUserAndPost($userId, $data['job_post_id'])) {
            return ['error' => 'Vous avez déjà postulé à ce poste.'];
        }

        // Create application
        $application = $this->jobApplicationRepository->create([
            'job_post_id' => $data['job_post_id'],
            'utilisateur_id' => $userId,
            'motivation' => $data['motivation'],
            'statut' => ApplicationStatus::PENDING,
            'applied_at' => now(),
        ]);

        // Log activity
        ActivityLogger::log(
            'JOB_APPLICATION_SUBMITTED',
            "Candidature soumise pour: {$jobPost->titre}",
            $userId
        );

        // Broadcast event to HR
        try {
            event(new NewApplicationEvent(
                applicationId: $application->id,
                jobPostId: $jobPost->id,
                jobPostTitre: $jobPost->titre,
                candidatNom: $user->nom . ' ' . $user->prenom,
                candidatMatricule: $user->matricule
            ));
        } catch (\Exception $e) {
            \Log::warning('Broadcast failed for NewApplicationEvent: ' . $e->getMessage());
        }

        return $application;
    }

    public function withdraw(int $applicationId, int $userId): bool|array
    {
        $application = $this->jobApplicationRepository->findOrFail($applicationId);

        // Validate ownership
        if ($application->utilisateur_id !== $userId) {
            return ['error' => 'Vous ne pouvez retirer que vos propres candidatures.'];
        }

        // Check if can withdraw
        if (!$application->canWithdraw()) {
            return ['error' => 'Cette candidature ne peut plus être retirée car elle a été examinée.'];
        }

        // Withdraw application
        $success = $application->withdraw();

        if ($success) {
            // Log activity
            ActivityLogger::log(
                'JOB_APPLICATION_WITHDRAWN',
                "Candidature retirée pour: {$application->jobPost->titre}",
                $userId
            );
        }

        return $success;
    }

    public function review(int $applicationId, int $reviewerId, string $action): bool|array
    {
        $application = $this->jobApplicationRepository->findWithRelations($applicationId);

        if (!$application) {
            return ['error' => 'Candidature introuvable.'];
        }

        if (!$application->isPending()) {
            return ['error' => 'Cette candidature a déjà été examinée.'];
        }

        $success = false;
        $actionLabel = '';

        switch ($action) {
            case 'accept':
                $success = $application->accept($reviewerId);
                $actionLabel = 'acceptée';
                break;
            case 'reject':
                $success = $application->reject($reviewerId);
                $actionLabel = 'rejetée';
                break;
            case 'reviewed':
                $success = $application->markAsReviewed($reviewerId);
                $actionLabel = 'examinée';
                break;
            default:
                return ['error' => 'Action invalide.'];
        }

        if ($success) {
            // Log activity
            ActivityLogger::log(
                'JOB_APPLICATION_REVIEWED',
                "Candidature {$actionLabel}: {$application->utilisateur->nom} pour {$application->jobPost->titre}",
                $reviewerId
            );

            // TODO: Notify the candidate
        }

        return $success;
    }

    public function countPending(): int
    {
        return $this->jobApplicationRepository->countPending();
    }

    public function countForUser(int $userId): int
    {
        return $this->jobApplicationRepository->countForUser($userId);
    }
}
