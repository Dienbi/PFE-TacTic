<?php

namespace App\Contracts\Repositories;

use Illuminate\Database\Eloquent\Collection;

interface ChildRepositoryInterface
{
    public function getByUtilisateur(int $utilisateurId): Collection;

    public function createForUtilisateur(int $utilisateurId, array $data): \App\Models\Child;

    public function updateChild(int $childId, array $data): bool;

    public function deleteChild(int $childId): bool;
}
