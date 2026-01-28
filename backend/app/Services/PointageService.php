<?php

namespace App\Services;

use App\Models\Pointage;
use App\Repositories\PointageRepository;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class PointageService
{
    public function __construct(
        protected PointageRepository $pointageRepository
    ) {}

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->pointageRepository->getByUtilisateur($utilisateurId);
    }

    public function getByDate(Carbon $date): Collection
    {
        return $this->pointageRepository->getByDate($date);
    }

    public function getByPeriod(int $utilisateurId, Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->pointageRepository->getByPeriod($utilisateurId, $startDate, $endDate);
    }

    public function getTodayPointage(int $utilisateurId): ?Pointage
    {
        return $this->pointageRepository->getTodayPointage($utilisateurId);
    }

    public function pointerEntree(int $utilisateurId): Pointage
    {
        return $this->pointageRepository->pointer($utilisateurId, 'entree');
    }

    public function pointerSortie(int $utilisateurId): Pointage
    {
        return $this->pointageRepository->pointer($utilisateurId, 'sortie');
    }

    public function marquerAbsence(int $utilisateurId, Carbon $date, bool $justifiee = false): Pointage
    {
        return $this->pointageRepository->create([
            'utilisateur_id' => $utilisateurId,
            'date' => $date,
            'absence_justifiee' => $justifiee,
        ]);
    }

    public function justifierAbsence(int $pointageId): bool
    {
        return $this->pointageRepository->update($pointageId, ['absence_justifiee' => true]);
    }

    public function getStats(int $utilisateurId, Carbon $startDate, Carbon $endDate): array
    {
        return $this->pointageRepository->getStatsByPeriod($utilisateurId, $startDate, $endDate);
    }

    public function getAbsences(int $utilisateurId, Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->pointageRepository->getAbsences($utilisateurId, $startDate, $endDate);
    }

    public function update(int $id, array $data): bool
    {
        return $this->pointageRepository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->pointageRepository->delete($id);
    }
}
