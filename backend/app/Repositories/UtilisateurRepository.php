<?php

namespace App\Repositories;

use App\Contracts\Repositories\UtilisateurRepositoryInterface;
use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Models\Utilisateur;
use App\Services\CacheService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class UtilisateurRepository extends BaseRepository implements UtilisateurRepositoryInterface
{
    public function __construct(
        Utilisateur $model,
        protected CacheService $cacheService
    ) {
        parent::__construct($model);
    }

    public function findByEmail(string $email): ?Utilisateur
    {
        return $this->model->where('email', $email)->first();
    }

    public function findByEmailIncludingArchived(string $email): ?Utilisateur
    {
        return $this->model->withTrashed()->where('email', $email)->first();
    }

    public function findByMatricule(string $matricule): ?Utilisateur
    {
        return $this->model->where('matricule', $matricule)->first();
    }

    public function getActifs(): Collection
    {
        return $this->cacheService->getActiveUsers(
            fn() => $this->model->actif()->get()
        );
    }

    public function getActifsPaginated(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->actif()->paginate($perPage);
    }

    public function getByRole(Role $role): Collection
    {
        return $this->model->byRole($role)->get();
    }

    public function getByEquipe(int $equipeId): Collection
    {
        return $this->model->where('equipe_id', $equipeId)->get();
    }

    public function getDisponibles(): Collection
    {
        return $this->model->disponible()->actif()->get();
    }

    public function updateStatus(int $id, EmployeStatus $status): bool
    {
        return $this->update($id, ['status' => $status]);
    }

    public function updateLastConnection(int $id): bool
    {
        return $this->update($id, ['date_derniere_connexion' => now()]);
    }

    public function deactivate(int $id): bool
    {
        return $this->update($id, ['actif' => false]);
    }

    public function activate(int $id): bool
    {
        return $this->update($id, ['actif' => true]);
    }

    /**
     * Soft delete (archive) a user
     */
    public function archive(int $id): bool
    {
        $user = $this->model->find($id);
        if ($user) {
            return $user->delete(); // This performs soft delete
        }
        return false;
    }

    /**
     * Restore an archived user
     */
    public function restore(int $id): bool
    {
        $user = $this->model->withTrashed()->find($id);
        if ($user && $user->trashed()) {
            return $user->restore();
        }
        return false;
    }

    /**
     * Permanently delete a user
     */
    public function forceDelete(int $id): bool
    {
        $user = $this->model->withTrashed()->find($id);
        if ($user) {
            return $user->forceDelete();
        }
        return false;
    }

    /**
     * Get all archived users
     */
    public function getArchived(): Collection
    {
        return $this->model->onlyTrashed()
            ->with('equipe')
            ->select(['id', 'matricule', 'nom', 'prenom', 'email', 'role', 'status', 'actif', 'telephone', 'date_embauche', 'salaire_base', 'equipe_id', 'deleted_at'])
            ->get();
    }

    /**
     * Get archived user by ID
     */
    public function getArchivedById(int $id): ?Utilisateur
    {
        return $this->model->onlyTrashed()->with('equipe')->find($id);
    }

    public function updateSoldeConge(int $id, int $jours): bool
    {
        $utilisateur = $this->findOrFail($id);
        return $utilisateur->update(['solde_conge' => $utilisateur->solde_conge - $jours]);
    }

    public function generateMatricule(): string
    {
        $lastUser = $this->model->withTrashed()->orderBy('id', 'desc')->first();
        $nextId = $lastUser ? $lastUser->id + 1 : 1;
        return 'EMP' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
    }

    public function searchByName(string $search): Collection
    {
        return $this->model->where(function ($query) use ($search) {
            $query->where('nom', 'ILIKE', "%{$search}%")
                  ->orWhere('prenom', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%")
                  ->orWhere('matricule', 'ILIKE', "%{$search}%");
        })->get();
    }

    public function getWithRelations(int $id): ?Utilisateur
    {
        return $this->model->with(['equipe', 'competences'])->find($id);
    }

    public function getAllWithRelations(): Collection
    {
        return $this->model->with(['equipe' => fn($q) => $q->withCount('membres')])
            ->select(['id', 'matricule', 'nom', 'prenom', 'email', 'role', 'status', 'actif', 'telephone', 'date_embauche', 'salaire_base', 'equipe_id', 'deleted_at'])
            ->whereNull('deleted_at')
            ->get();
    }
}
