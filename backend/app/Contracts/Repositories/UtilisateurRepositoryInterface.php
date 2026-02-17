<?php

namespace App\Contracts\Repositories;

use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Models\Utilisateur;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface UtilisateurRepositoryInterface
{
    public function findByEmail(string $email): ?Utilisateur;

    public function findByEmailIncludingArchived(string $email): ?Utilisateur;

    public function findByMatricule(string $matricule): ?Utilisateur;

    public function getActifs(): Collection;

    public function getActifsPaginated(int $perPage = 15): LengthAwarePaginator;

    public function getByRole(Role $role): Collection;

    public function getByEquipe(int $equipeId): Collection;

    public function getDisponibles(): Collection;

    public function updateStatus(int $id, EmployeStatus $status): bool;

    public function updateLastConnection(int $id): bool;

    public function deactivate(int $id): bool;

    public function activate(int $id): bool;

    public function archive(int $id): bool;

    public function restore(int $id): bool;

    public function forceDelete(int $id): bool;

    public function getArchived(): Collection;

    public function getArchivedById(int $id): ?Utilisateur;

    public function updateSoldeConge(int $id, int $jours): bool;

    public function generateMatricule(): string;

    public function searchByName(string $search): Collection;
}
