<?php

namespace App\Contracts\Repositories;

use App\Models\Equipe;
use Illuminate\Database\Eloquent\Collection;

interface EquipeRepositoryInterface
{
    public function getAllWithCounts(): Collection;

    public function getAllWithRelations(): Collection;

    public function findWithMembers(int $id): ?Equipe;

    public function addMember(int $equipeId, int $utilisateurId): bool;

    public function removeMember(int $utilisateurId): bool;

    public function getMembersCount(int $equipeId): int;
}
