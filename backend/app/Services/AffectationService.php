<?php

namespace App\Services;

use App\Enums\EmployeStatus;
use App\Models\Affectation;
use App\Repositories\AffectationRepository;
use App\Repositories\UtilisateurRepository;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class AffectationService
{
    public function __construct(
        protected AffectationRepository $affectationRepository,
        protected UtilisateurRepository $utilisateurRepository
    ) {}

    public function getAll(): Collection
    {
        return $this->affectationRepository->all();
    }

    public function getById(int $id): ?Affectation
    {
        return $this->affectationRepository->find($id);
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->affectationRepository->getByUtilisateur($utilisateurId);
    }

    public function getByPoste(int $posteId): Collection
    {
        return $this->affectationRepository->getByPoste($posteId);
    }

    public function getActives(): Collection
    {
        return $this->affectationRepository->getActives();
    }

    public function create(array $data): Affectation|array
    {
        // Check if user already has an active assignment
        if ($this->affectationRepository->hasActiveAffectation($data['utilisateur_id'])) {
            return ['error' => 'L\'utilisateur a déjà une affectation active.'];
        }

        $affectation = $this->affectationRepository->create($data);

        // Update user status
        $this->utilisateurRepository->updateStatus(
            $data['utilisateur_id'],
            EmployeStatus::AFFECTE
        );

        return $affectation;
    }

    public function terminer(int $affectationId, ?Carbon $dateFin = null): bool
    {
        $affectation = $this->affectationRepository->findOrFail($affectationId);

        // Update user status
        $this->utilisateurRepository->updateStatus(
            $affectation->utilisateur_id,
            EmployeStatus::DISPONIBLE
        );

        return $this->affectationRepository->terminer($affectationId, $dateFin);
    }

    public function update(int $id, array $data): bool
    {
        return $this->affectationRepository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        $affectation = $this->affectationRepository->findOrFail($id);

        // Update user status if active
        if ($affectation->isActif()) {
            $this->utilisateurRepository->updateStatus(
                $affectation->utilisateur_id,
                EmployeStatus::DISPONIBLE
            );
        }

        return $this->affectationRepository->delete($id);
    }
}
