<?php

namespace App\Services;

use App\Enums\JobPostStatus;
use App\Enums\JobRequestStatus;
use App\Enums\Role;
use App\Events\JobRequestReviewedEvent;
use App\Events\NewJobRequestEvent;
use App\Models\JobRequest;
use App\Repositories\JobPostRepository;
use App\Repositories\JobRequestRepository;
use App\Repositories\UtilisateurRepository;
use Illuminate\Database\Eloquent\Collection;

class JobRequestService
{
    public function __construct(
        protected JobRequestRepository $jobRequestRepository,
        protected UtilisateurRepository $utilisateurRepository,
        protected JobPostRepository $jobPostRepository
    ) {}

    public function getAll(): Collection
    {
        return $this->jobRequestRepository->getAll();
    }

    public function getById(int $id): ?JobRequest
    {
        return $this->jobRequestRepository->findWithRelations($id);
    }

    public function getByDemandeur(int $userId): Collection
    {
        return $this->jobRequestRepository->getByDemandeur($userId);
    }

    public function getPending(): Collection
    {
        return $this->jobRequestRepository->getPending();
    }

    public function getByEquipe(int $equipeId): Collection
    {
        return $this->jobRequestRepository->getByEquipe($equipeId);
    }

    public function create(int $demandeurId, array $data): JobRequest|array
    {
        // Validate that demandeur is a manager
        $demandeur = $this->utilisateurRepository->findOrFail($demandeurId);

        if (!$demandeur->isChefEquipe()) {
            return ['error' => 'Seuls les chefs d\'équipe peuvent créer des demandes de poste.'];
        }

        // Validate that the manager belongs to the equipe
        if ($demandeur->equipe_id !== $data['equipe_id']) {
            return ['error' => 'Vous ne pouvez créer une demande que pour votre propre équipe.'];
        }

        // Create the job request
        $jobRequest = $this->jobRequestRepository->create([
            'titre' => $data['titre'],
            'description' => $data['description'],
            'equipe_id' => $data['equipe_id'],
            'demandeur_id' => $demandeurId,
            'statut' => JobRequestStatus::PENDING,
        ]);

        // Log activity
        ActivityLogger::log(
            'JOB_REQUEST_CREATED',
            "Demande de poste créée: {$data['titre']}",
            $demandeurId
        );

        // Broadcast event to HR (non-blocking)
        try {
            event(new NewJobRequestEvent(
                jobRequestId: $jobRequest->id,
                titre: $jobRequest->titre,
                demandeurNom: $demandeur->nom . ' ' . $demandeur->prenom,
                equipeNom: $jobRequest->equipe->nom
            ));
        } catch (\Exception $e) {
            \Log::warning('Broadcast failed for NewJobRequestEvent: ' . $e->getMessage());
        }

        return $jobRequest;
    }

    public function update(int $id, array $data): bool|array
    {
        $jobRequest = $this->jobRequestRepository->findOrFail($id);

        // Only pending requests can be updated
        if (!$jobRequest->isPending()) {
            return ['error' => 'Seules les demandes en attente peuvent être modifiées.'];
        }

        return $this->jobRequestRepository->update($id, [
            'titre' => $data['titre'] ?? $jobRequest->titre,
            'description' => $data['description'] ?? $jobRequest->description,
        ]);
    }

    public function approve(int $id, int $approvedById): array
    {
        $jobRequest = $this->jobRequestRepository->findWithRelations($id);

        if (!$jobRequest) {
            return ['error' => 'Demande de poste introuvable.'];
        }

        if (!$jobRequest->isPending()) {
            return ['error' => 'Cette demande a déjà été traitée.'];
        }

        // Approve the request
        $success = $jobRequest->approve();

        if (!$success) {
            return ['error' => 'Échec de l\'approbation de la demande.'];
        }

        // Auto-create a draft JobPost from this request
        $jobPost = $this->jobPostRepository->create([
            'job_request_id' => $jobRequest->id,
            'titre' => $jobRequest->titre,
            'description' => $jobRequest->description,
            'statut' => JobPostStatus::DRAFT,
            'created_by' => $approvedById,
        ]);

        // Log activity
        ActivityLogger::log(
            'JOB_REQUEST_APPROVED',
            "Demande de poste approuvée: {$jobRequest->titre}",
            $approvedById
        );

        ActivityLogger::log(
            'JOB_POST_CREATED',
            "Poste créé automatiquement: {$jobPost->titre}",
            $approvedById
        );

        // Notify the manager (non-blocking)
        try {
            event(new JobRequestReviewedEvent(
                userId: $jobRequest->demandeur_id,
                jobRequestId: $jobRequest->id,
                titre: $jobRequest->titre,
                approved: true
            ));
        } catch (\Exception $e) {
            \Log::warning('Broadcast failed for JobRequestReviewedEvent: ' . $e->getMessage());
        }

        return ['success' => true, 'job_post' => $jobPost];
    }

    public function reject(int $id, string $raison, int $rejectedById): bool|array
    {
        $jobRequest = $this->jobRequestRepository->findWithRelations($id);

        if (!$jobRequest) {
            return ['error' => 'Demande de poste introuvable.'];
        }

        if (!$jobRequest->isPending()) {
            return ['error' => 'Cette demande a déjà été traitée.'];
        }

        // Reject the request
        $success = $jobRequest->reject($raison);

        if ($success) {
            // Log activity
            ActivityLogger::log(
                'JOB_REQUEST_REJECTED',
                "Demande de poste rejetée: {$jobRequest->titre}",
                $rejectedById
            );

            // Notify the manager (non-blocking)
            try {
                event(new JobRequestReviewedEvent(
                    userId: $jobRequest->demandeur_id,
                    jobRequestId: $jobRequest->id,
                    titre: $jobRequest->titre,
                    approved: false,
                    raison: $raison
                ));
            } catch (\Exception $e) {
                \Log::warning('Broadcast failed for JobRequestReviewedEvent: ' . $e->getMessage());
            }
        }

        return $success;
    }

    public function delete(int $id): bool|array
    {
        $jobRequest = $this->jobRequestRepository->findOrFail($id);

        // Only pending requests can be deleted
        if (!$jobRequest->isPending()) {
            return ['error' => 'Seules les demandes en attente peuvent être supprimées.'];
        }

        return $this->jobRequestRepository->delete($id);
    }

    public function countPending(): int
    {
        return $this->jobRequestRepository->countPending();
    }
}
