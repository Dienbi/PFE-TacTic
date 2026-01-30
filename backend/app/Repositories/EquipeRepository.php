<?php

namespace App\Repositories;

use App\Models\Equipe;
use Illuminate\Database\Eloquent\Collection;

class EquipeRepository extends BaseRepository
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

    public function assignChef(int $equipeId, int $chefId): bool
    {
        return $this->update($equipeId, ['chef_equipe_id' => $chefId]);
    }

    public function removeChef(int $equipeId): bool
    {
        return $this->update($equipeId, ['chef_equipe_id' => null]);
    }
}
