<?php

namespace App\Repositories;

use App\Models\Competence;
use Illuminate\Database\Eloquent\Collection;

class CompetenceRepository extends BaseRepository
{
    public function __construct(Competence $model)
    {
        parent::__construct($model);
    }

    public function getWithUtilisateurs(int $id): ?Competence
    {
        return $this->model->with('utilisateurs')->find($id);
    }

    public function getAllWithUtilisateurs(): Collection
    {
        return $this->model->with('utilisateurs')->get();
    }

    public function searchByNom(string $search): Collection
    {
        return $this->model->where('nom', 'ILIKE', "%{$search}%")->get();
    }

    public function getByNiveau(int $niveau): Collection
    {
        return $this->model->where('niveau', '>=', $niveau)->get();
    }
}
