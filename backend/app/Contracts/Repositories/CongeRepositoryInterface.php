<?php

namespace App\Contracts\Repositories;

use App\Enums\TypeConge;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface CongeRepositoryInterface
{
    public function getByUtilisateur(int $utilisateurId): Collection;

    public function paginateWithUtilisateur(int $perPage, int $page): LengthAwarePaginator;

    public function getEnAttente(): Collection;

    public function getEnAttenteLimited(int $limit = 5): Collection;

    public function getEnAttenteByEquipe(int $equipeId): Collection;

    public function approuver(int $congeId, int $approuveParId): bool;

    public function refuser(int $congeId, int $approuveParId): bool;

    public function getByPeriod(Carbon $startDate, Carbon $endDate): Collection;

    public function getByType(TypeConge $type): Collection;

    public function hasConflict(int $utilisateurId, Carbon $dateDebut, Carbon $dateFin, ?int $excludeId = null): bool;

    public function getApprouvesByPeriod(int $utilisateurId, Carbon $startDate, Carbon $endDate): Collection;
}
