<?php

namespace App\Repositories;

use App\Contracts\Repositories\ChildRepositoryInterface;
use App\Models\Child;
use Illuminate\Database\Eloquent\Collection;

class ChildRepository extends BaseRepository implements ChildRepositoryInterface
{
    public function __construct(Child $model)
    {
        parent::__construct($model);
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->orderBy('date_naissance', 'desc')
            ->get();
    }

    public function createForUtilisateur(int $utilisateurId, array $data): Child
    {
        return $this->model->create(array_merge($data, ['utilisateur_id' => $utilisateurId]));
    }

    public function updateChild(int $childId, array $data): bool
    {
        return $this->update($childId, $data);
    }

    public function deleteChild(int $childId): bool
    {
        return $this->delete($childId);
    }
}
