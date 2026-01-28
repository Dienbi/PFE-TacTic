<?php

namespace App\Repositories;

use App\Models\Pointage;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class PointageRepository extends BaseRepository
{
    public function __construct(Pointage $model)
    {
        parent::__construct($model);
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->orderBy('date', 'desc')
            ->get();
    }

    public function getByDate(Carbon $date): Collection
    {
        return $this->model->byDate($date)->with('utilisateur')->get();
    }

    public function getByPeriod(int $utilisateurId, Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->byPeriod($startDate, $endDate)
            ->orderBy('date', 'asc')
            ->get();
    }

    public function getTodayPointage(int $utilisateurId): ?Pointage
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->byDate(Carbon::today())
            ->first();
    }

    public function pointer(int $utilisateurId, string $type): Pointage
    {
        $today = Carbon::today();
        $pointage = $this->getTodayPointage($utilisateurId);

        if (!$pointage) {
            $pointage = $this->create([
                'utilisateur_id' => $utilisateurId,
                'date' => $today,
                'heure_entree' => $type === 'entree' ? Carbon::now() : null,
            ]);
        } else if ($type === 'sortie' && !$pointage->heure_sortie) {
            $pointage->heure_sortie = Carbon::now();
            $pointage->calculerDureeTravail();
        }

        return $pointage;
    }

    public function getAbsences(int $utilisateurId, Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->byPeriod($startDate, $endDate)
            ->absences()
            ->get();
    }

    public function getStatsByPeriod(int $utilisateurId, Carbon $startDate, Carbon $endDate): array
    {
        $pointages = $this->getByPeriod($utilisateurId, $startDate, $endDate);

        return [
            'total_jours' => $pointages->count(),
            'total_heures' => $pointages->sum('duree_travail'),
            'absences' => $pointages->whereNull('heure_entree')->count(),
            'absences_justifiees' => $pointages->where('absence_justifiee', true)->count(),
        ];
    }
}
