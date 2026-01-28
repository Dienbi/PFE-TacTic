<?php

namespace App\Repositories;

use App\Models\Poste;
use Illuminate\Database\Eloquent\Collection;

class PosteRepository extends BaseRepository
{
    public function __construct(Poste $model)
    {
        parent::__construct($model);
    }

    public function getActifs(): Collection
    {
        return $this->model->actif()->get();
    }

    public function getWithAffectations(int $id): ?Poste
    {
        return $this->model->with(['affectations.utilisateur'])->find($id);
    }

    public function getAllWithAffectations(): Collection
    {
        return $this->model->with(['affectations.utilisateur'])->get();
    }

    public function searchByTitre(string $search): Collection
    {
        return $this->model->where('titre', 'ILIKE', "%{$search}%")->get();
    }
}
