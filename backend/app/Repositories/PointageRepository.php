<?php

namespace App\Repositories;

use App\Contracts\Repositories\PointageRepositoryInterface;
use App\Enums\Role;
use App\Models\Pointage;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;

class PointageRepository extends BaseRepository implements PointageRepositoryInterface
{
    public function __construct(Pointage $model)
    {
        parent::__construct($model);
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->with('utilisateur')
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

        if (! $pointage) {
            $pointage = $this->create([
                'utilisateur_id' => $utilisateurId,
                'date' => $today,
                'heure_entree' => $type === 'entree' ? Carbon::now() : null,
            ]);
        } elseif ($type === 'sortie' && ! $pointage->heure_sortie) {
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

    public function getByUtilisateurPaginated(int $utilisateurId, int $perPage, int $page): array
    {
        $result = $this->model->where('utilisateur_id', $utilisateurId)
            ->with('utilisateur')
            ->orderBy('date', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return [
            'data' => $result->items(),
            'current_page' => $result->currentPage(),
            'per_page' => $result->perPage(),
            'total' => $result->total(),
            'last_page' => $result->lastPage(),
        ];
    }

    public function getStatsByPeriod(int $utilisateurId, Carbon $startDate, Carbon $endDate): array
    {
        $row = $this->model->where('utilisateur_id', $utilisateurId)
            ->byPeriod($startDate, $endDate)
            ->selectRaw('
                COUNT(*) as total_jours,
                COALESCE(SUM(duree_travail), 0) as total_heures,
                SUM(CASE WHEN heure_entree IS NULL THEN 1 ELSE 0 END) as absences,
                SUM(CASE WHEN absence_justifiee = true THEN 1 ELSE 0 END) as absences_justifiees
            ')
            ->first();

        return [
            'total_jours' => (int) $row->total_jours,
            'total_heures' => (float) $row->total_heures,
            'absences' => (int) $row->absences,
            'absences_justifiees' => (int) $row->absences_justifiees,
        ];
    }

    public function checkIn(int $utilisateurId): Pointage
    {
        $today = Carbon::today();
        $pointage = $this->getTodayPointage($utilisateurId);

        if (! $pointage) {
            $pointage = $this->create([
                'utilisateur_id' => $utilisateurId,
                'date' => $today,
                'heure_entree' => Carbon::now(),
            ]);
        } elseif (! $pointage->heure_entree) {
            $pointage->heure_entree = Carbon::now();
            $pointage->save();
        }

        return $pointage;
    }

    public function checkOut(int $utilisateurId): bool
    {
        $pointage = $this->getTodayPointage($utilisateurId);

        if ($pointage && $pointage->heure_entree && ! $pointage->heure_sortie) {
            $pointage->heure_sortie = Carbon::now();
            $pointage->calculerDureeTravail();

            return true;
        }

        return false;
    }

    public function getHeuresSupp(int $utilisateurId, Carbon $startDate, Carbon $endDate): float
    {
        return (float) $this->model->where('utilisateur_id', $utilisateurId)
            ->byPeriod($startDate, $endDate)
            ->where('duree_travail', '>', 8)
            ->selectRaw('COALESCE(SUM(duree_travail - 8), 0) as heures_supp')
            ->value('heures_supp');
    }

    /**
     * Aggregate absence and late counts per employee/team leader for anomaly detection.
     */
    public function getAnomalyAggregates(Carbon $startDate, Carbon $endDate, string $lateThreshold = '09:15:00'): SupportCollection
    {
        $aggSub = DB::table('pointages')
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->groupBy('utilisateur_id')
            ->selectRaw("
                utilisateur_id,
                SUM(CASE WHEN heure_entree IS NULL THEN 1 ELSE 0 END) as absence_count,
                SUM(CASE WHEN heure_entree IS NULL AND COALESCE(absence_justifiee, false) = false THEN 1 ELSE 0 END) as unjustified_absence_count,
                SUM(CASE WHEN heure_entree IS NOT NULL AND heure_entree > '{$lateThreshold}' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN heure_entree IS NOT NULL THEN 1 ELSE 0 END) as present_count
            ");

        return DB::table('utilisateurs as u')
            ->leftJoinSub($aggSub, 'agg', function (JoinClause $join) {
                $join->on('u.id', '=', 'agg.utilisateur_id');
            })
            ->whereNull('u.deleted_at')
            ->where('u.actif', true)
            ->whereIn('u.role', [Role::EMPLOYE->value, Role::CHEF_EQUIPE->value])
            ->select([
                'u.id',
                'u.nom',
                'u.prenom',
                'u.matricule',
                'u.role',
                DB::raw('COALESCE(agg.absence_count, 0) as absence_count'),
                DB::raw('COALESCE(agg.unjustified_absence_count, 0) as unjustified_absence_count'),
                DB::raw('COALESCE(agg.late_count, 0) as late_count'),
                DB::raw('COALESCE(agg.present_count, 0) as present_count'),
            ])
            ->get();
    }
}
