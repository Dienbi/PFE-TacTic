<?php

namespace App\Contracts\Repositories;

use App\Models\Pointage;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

interface PointageRepositoryInterface
{
    public function getByUtilisateur(int $utilisateurId): Collection;

    public function getByUtilisateurPaginated(int $utilisateurId, int $perPage, int $page): array;

    public function getByDate(Carbon $date): Collection;

    public function getByPeriod(int $utilisateurId, Carbon $startDate, Carbon $endDate): Collection;

    public function getTodayPointage(int $utilisateurId): ?Pointage;

    public function checkIn(int $utilisateurId): Pointage;

    public function checkOut(int $utilisateurId): bool;

    public function getHeuresSupp(int $utilisateurId, Carbon $startDate, Carbon $endDate): float;
}
