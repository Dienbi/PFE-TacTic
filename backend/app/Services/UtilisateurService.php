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

        $user = $this->utilisateurRepository->create($data);

        ActivityLogger::log('USER_CREATED', "Created user: {$user->prenom} {$user->nom} ({$user->email})");

        return $user;
    }

    public function update(int $id, array $data): bool
    {
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user = $this->utilisateurRepository->findOrFail($id);
        $result = $this->utilisateurRepository->update($id, $data);

        if ($result) {
            ActivityLogger::log('USER_UPDATED', "Updated user: {$user->prenom} {$user->nom}");
        }

        return $result;
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
        $user = $this->utilisateurRepository->findOrFail($utilisateurId);
        $result = $this->utilisateurRepository->update($utilisateurId, ['equipe_id' => $equipeId]);

        if ($result) {
            ActivityLogger::log('TEAM_ASSIGNED', "Assigned {$user->prenom} {$user->nom} to team #{$equipeId}");
        }

        return $result;
    }

    public function removeFromEquipe(int $utilisateurId): bool
    {
        $user = $this->utilisateurRepository->findOrFail($utilisateurId);
        $result = $this->utilisateurRepository->update($utilisateurId, ['equipe_id' => null]);

        if ($result) {
            ActivityLogger::log('TEAM_REMOVED', "Removed {$user->prenom} {$user->nom} from team");
        }

        return $result;
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

    /**
     * Archive (soft delete) a user
     */
    public function archive(int $id): bool
    {
        $user = $this->utilisateurRepository->findOrFail($id);
        $result = $this->utilisateurRepository->archive($id);

        if ($result) {
            ActivityLogger::log('USER_ARCHIVED', "Archived user: {$user->prenom} {$user->nom}");
        }

        return $result;
    }

    /**
     * Restore an archived user
     */
    public function restore(int $id): bool
    {
        $user = $this->utilisateurRepository->getArchivedById($id);
        $result = $this->utilisateurRepository->restore($id);

        if ($result && $user) {
            ActivityLogger::log('USER_RESTORED', "Restored user: {$user->prenom} {$user->nom}");
        }

        return $result;
    }

    /**
     * Permanently delete a user
     */
    public function forceDelete(int $id): bool
    {
        $user = $this->utilisateurRepository->getArchivedById($id);
        $userName = $user ? "{$user->prenom} {$user->nom}" : "User #{$id}";
        $result = $this->utilisateurRepository->forceDelete($id);

        if ($result) {
            ActivityLogger::log('USER_DELETED', "Permanently deleted user: {$userName}");
        }

        return $result;
    }

    /**
     * Get all archived users
     */
    public function getArchived(): \Illuminate\Database\Eloquent\Collection
    {
        return $this->utilisateurRepository->getArchived();
    }

    /**
     * Get archived user by ID
     */
    public function getArchivedById(int $id): ?\App\Models\Utilisateur
    {
        return $this->utilisateurRepository->getArchivedById($id);
    }
}
