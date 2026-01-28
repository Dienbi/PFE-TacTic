<?php

namespace App\Repositories;

use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Models\Utilisateur;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class UtilisateurRepository extends BaseRepository
{
    public function __construct(Utilisateur $model)
    {
        parent::__construct($model);
    }

    public function findByEmail(string $email): ?Utilisateur
    {
        return $this->model->where('email', $email)->first();
    }

    public function findByMatricule(string $matricule): ?Utilisateur
    {
        return $this->model->where('matricule', $matricule)->first();
    }

    public function getActifs(): Collection
    {
        return $this->model->actif()->get();
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

    public function updateSoldeConge(int $id, int $jours): bool
    {
        $utilisateur = $this->findOrFail($id);
        return $utilisateur->update(['solde_conge' => $utilisateur->solde_conge - $jours]);
    }

    public function generateMatricule(): string
    {
        $lastUser = $this->model->orderBy('id', 'desc')->first();
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
        return $this->model->with(['equipe', 'competences', 'affectations.poste'])->find($id);
    }

    public function getAllWithRelations(): Collection
    {
        return $this->model->with(['equipe', 'competences'])->actif()->get();
    }
}
