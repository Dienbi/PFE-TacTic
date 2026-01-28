<?php

namespace App\Services;

use App\Models\Equipe;
use App\Repositories\EquipeRepository;
use App\Repositories\UtilisateurRepository;
use Illuminate\Database\Eloquent\Collection;

class EquipeService
{
    public function __construct(
        protected EquipeRepository $equipeRepository,
        protected UtilisateurRepository $utilisateurRepository
    ) {}

    public function getAll(): Collection
    {
        return $this->equipeRepository->getAllWithRelations();
    }

    public function getById(int $id): ?Equipe
    {
        return $this->equipeRepository->getWithMembres($id);
    }

    public function create(array $data): Equipe
    {
        return $this->equipeRepository->create($data);
    }

    public function update(int $id, array $data): bool
    {
        return $this->equipeRepository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        // Remove all members from team first
        $equipe = $this->equipeRepository->getWithMembres($id);
        foreach ($equipe->membres as $membre) {
            $this->utilisateurRepository->update($membre->id, ['equipe_id' => null]);
        }

        return $this->equipeRepository->delete($id);
    }

    public function assignChef(int $equipeId, int $chefId): bool
    {
        return $this->equipeRepository->assignChef($equipeId, $chefId);
    }

    public function removeChef(int $equipeId): bool
    {
        return $this->equipeRepository->removeChef($equipeId);
    }

    public function addMembre(int $equipeId, int $utilisateurId): bool
    {
        return $this->utilisateurRepository->update($utilisateurId, ['equipe_id' => $equipeId]);
    }

    public function removeMembre(int $utilisateurId): bool
    {
        return $this->utilisateurRepository->update($utilisateurId, ['equipe_id' => null]);
    }

    public function getMembres(int $equipeId): Collection
    {
        return $this->utilisateurRepository->getByEquipe($equipeId);
    }
}
