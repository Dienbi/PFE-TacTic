<?php

namespace App\Repositories;

use App\Contracts\Repositories\EquipeRepositoryInterface;
use App\Models\Equipe;
use App\Models\Utilisateur;
use Illuminate\Database\Eloquent\Collection;

class EquipeRepository extends BaseRepository implements EquipeRepositoryInterface
{
    public function __construct(Equipe $model)
    {
        parent::__construct($model);
    }

    public function getWithMembres(int $id): ?Equipe
    {
        return $this->model->with(['chefEquipe', 'membres'])->find($id);
    }

    public function getAllWithRelations(): Collection
    {
        return $this->model->with(['chefEquipe', 'membres'])->get();
    }

    public function getAllWithCounts(): Collection
    {
        return $this->model->with('chefEquipe')->withCount('membres')->get();
    }

    /**
     * Get all teams for dropdown (only id and name)
     */
    public function getAllSimple(): Collection
    {
        return $this->model->select(['id', 'nom'])->get();
    }

    public function findByChef(int $chefId): ?Equipe
    {
        return $this->model->where('chef_equipe_id', $chefId)->first();
    }

    public function getWithMembresByChef(int $chefId): ?Equipe
    {
        return $this->model->where('chef_equipe_id', $chefId)
            ->with(['membres', 'chefEquipe'])
            ->first();
    }

    public function assignChef(int $equipeId, int $chefId): bool
    {
        return $this->update($equipeId, ['chef_equipe_id' => $chefId]);
    }

    public function removeChef(int $equipeId): bool
    {
        return $this->update($equipeId, ['chef_equipe_id' => null]);
    }

    public function findWithMembers(int $id): ?Equipe
    {
        return $this->model->with(['chefEquipe', 'membres'])->find($id);
    }

    public function addMember(int $equipeId, int $utilisateurId): bool
    {
        $utilisateur = Utilisateur::find($utilisateurId);
        if (!$utilisateur) {
            return false;
        }
        $utilisateur->equipe_id = $equipeId;
        return $utilisateur->save();
    }

    public function removeMember(int $utilisateurId): bool
    {
        $utilisateur = Utilisateur::find($utilisateurId);
        if (!$utilisateur) {
            return false;
        }
        $utilisateur->equipe_id = null;
        return $utilisateur->save();
    }

    public function getMembersCount(int $equipeId): int
    {
        $equipe = $this->model->withCount('membres')->find($equipeId);
        return $equipe ? $equipe->membres_count : 0;
    }
}
