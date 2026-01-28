<?php

namespace App\Services;

use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Models\Utilisateur;
use App\Repositories\UtilisateurRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;

class UtilisateurService
{
    public function __construct(
        protected UtilisateurRepository $utilisateurRepository
    ) {}

    public function getAll(): Collection
    {
        return $this->utilisateurRepository->getAllWithRelations();
    }

    public function getPaginated(int $perPage = 15): LengthAwarePaginator
    {
        return $this->utilisateurRepository->getActifsPaginated($perPage);
    }

    public function getById(int $id): ?Utilisateur
    {
        return $this->utilisateurRepository->getWithRelations($id);
    }

    public function create(array $data): Utilisateur
    {
        $data['password'] = Hash::make($data['password']);
        $data['matricule'] = $this->utilisateurRepository->generateMatricule();

        return $this->utilisateurRepository->create($data);
    }

    public function update(int $id, array $data): bool
    {
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        return $this->utilisateurRepository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->utilisateurRepository->deactivate($id);
    }

    public function hardDelete(int $id): bool
    {
        return $this->utilisateurRepository->delete($id);
    }

    public function activate(int $id): bool
    {
        return $this->utilisateurRepository->activate($id);
    }

    public function getByRole(Role $role): Collection
    {
        return $this->utilisateurRepository->getByRole($role);
    }

    public function getByEquipe(int $equipeId): Collection
    {
        return $this->utilisateurRepository->getByEquipe($equipeId);
    }

    public function getDisponibles(): Collection
    {
        return $this->utilisateurRepository->getDisponibles();
    }

    public function updateStatus(int $id, EmployeStatus $status): bool
    {
        return $this->utilisateurRepository->updateStatus($id, $status);
    }

    public function search(string $search): Collection
    {
        return $this->utilisateurRepository->searchByName($search);
    }

    public function assignToEquipe(int $utilisateurId, int $equipeId): bool
    {
        return $this->utilisateurRepository->update($utilisateurId, ['equipe_id' => $equipeId]);
    }

    public function removeFromEquipe(int $utilisateurId): bool
    {
        return $this->utilisateurRepository->update($utilisateurId, ['equipe_id' => null]);
    }

    public function updateCompetences(int $utilisateurId, array $competences): void
    {
        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);
        $utilisateur->competences()->sync($competences);
    }

    public function addCompetence(int $utilisateurId, int $competenceId, int $niveau = 1): void
    {
        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);
        $utilisateur->competences()->attach($competenceId, ['niveau' => $niveau]);
    }

    public function removeCompetence(int $utilisateurId, int $competenceId): void
    {
        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);
        $utilisateur->competences()->detach($competenceId);
    }
}
