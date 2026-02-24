<?php

namespace App\Contracts\Repositories;

use App\Enums\StatutPaie;
use App\Models\Paie;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

interface PaieRepositoryInterface
{
    public function getByUtilisateur(int $utilisateurId): Collection;

    public function getByPeriod(Carbon $startDate, Carbon $endDate): Collection;

    public function getNonPayees(): Collection;

    public function getAllWithUtilisateur(): Collection;

    public function marquerPayee(int $paieId): bool;

    public function valider(int $paieId): bool;

    public function getLastPaie(int $utilisateurId): ?Paie;

    public function getLastPaiesForUsers(array $utilisateurIds): array;

    public function existsForPeriod(int $utilisateurId, Carbon $periodeDebut, Carbon $periodeFin): bool;

    public function getTotalSalairesParMois(int $year, int $month): float;

    public function getStatsByUtilisateur(int $utilisateurId): array;

    public function getStatsForUsers(array $utilisateurIds): array;

    public function getGlobalStats(): array;

    public function getByStatut(StatutPaie $statut): Collection;
}
