<?php

namespace App\Repositories;

use App\Contracts\Repositories\PaieRepositoryInterface;
use App\Enums\StatutPaie;
use App\Models\Paie;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class PaieRepository extends BaseRepository implements PaieRepositoryInterface
{
    public function __construct(Paie $model)
    {
        parent::__construct($model);
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->with('utilisateur')
            ->orderBy('periode_debut', 'desc')
            ->get();
    }

    public function getByPeriod(Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->model->byPeriod($startDate, $endDate)
            ->with('utilisateur')
            ->get();
    }

    public function getNonPayees(): Collection
    {
        return $this->model->nonPaye()
            ->with('utilisateur')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getAllWithUtilisateur(): Collection
    {
        return $this->model->with('utilisateur')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function marquerPayee(int $paieId): bool
    {
        return $this->update($paieId, [
            'date_paiement' => Carbon::now(),
            'statut' => StatutPaie::PAYE,
        ]);
    }

    public function valider(int $paieId): bool
    {
        return $this->update($paieId, [
            'statut' => StatutPaie::VALIDE,
        ]);
    }

    public function getLastPaie(int $utilisateurId): ?Paie
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->orderBy('periode_fin', 'desc')
            ->first();
    }

    /**
     * Get last paie for multiple users at once (optimized to avoid N+1 queries)
     * Returns an array keyed by utilisateur_id
     */
    public function getLastPaiesForUsers(array $utilisateurIds): array
    {
        if (empty($utilisateurIds)) {
            return [];
        }

        // Get the most recent paie for each user using a subquery
        $subquery = $this->model
            ->selectRaw('MAX(id) as max_id')
            ->whereIn('utilisateur_id', $utilisateurIds)
            ->groupBy('utilisateur_id');

        $paies = $this->model
            ->whereIn('id', function ($query) use ($utilisateurIds) {
                $query->selectRaw('MAX(id)')
                    ->from('paies')
                    ->whereIn('utilisateur_id', $utilisateurIds)
                    ->groupBy('utilisateur_id');
            })
            ->get()
            ->keyBy('utilisateur_id');

        return $paies->toArray();
    }

    public function existsForPeriod(int $utilisateurId, Carbon $periodeDebut, Carbon $periodeFin): bool
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->where('periode_debut', $periodeDebut)
            ->where('periode_fin', $periodeFin)
            ->exists();
    }

    public function getTotalSalairesParMois(int $year, int $month): float
    {
        return $this->model
            ->whereYear('periode_debut', $year)
            ->whereMonth('periode_debut', $month)
            ->sum('salaire_net');
    }

    public function getStatsByUtilisateur(int $utilisateurId): array
    {
        $paies = $this->getByUtilisateur($utilisateurId);

        return [
            'total_brut' => round($paies->sum('salaire_brut'), 2),
            'total_net' => round($paies->sum('salaire_net'), 2),
            'total_deductions' => round($paies->sum('deductions'), 2),
            'total_cnss' => round($paies->sum('cnss_employe'), 2),
            'total_impot' => round($paies->sum('impot_mensuel'), 2),
            'moyenne_net' => round($paies->avg('salaire_net'), 2),
            'nombre_paies' => $paies->count(),
            'derniere_paie' => $paies->first(),
        ];
    }

    /**
     * Get global payroll statistics using optimized aggregate queries
     * Avoids loading all records into memory
     */
    public function getGlobalStats(): array
    {
        $currentMonth = Carbon::now();

        // Get current month aggregates in a single query
        $currentMonthStats = $this->model
            ->whereYear('periode_debut', $currentMonth->year)
            ->whereMonth('periode_debut', $currentMonth->month)
            ->selectRaw('
                COUNT(*) as paies_count,
                COALESCE(SUM(salaire_brut), 0) as total_brut,
                COALESCE(SUM(salaire_net), 0) as total_net,
                COALESCE(SUM(cnss_employe), 0) as total_cnss,
                COALESCE(SUM(impot_mensuel), 0) as total_impot,
                COALESCE(SUM(deductions), 0) as total_deductions
            ')
            ->first();

        // Get status counts in a single query using conditional aggregation
        $statusCounts = $this->model
            ->whereYear('periode_debut', $currentMonth->year)
            ->whereMonth('periode_debut', $currentMonth->month)
            ->selectRaw("
                SUM(CASE WHEN statut = ? THEN 1 ELSE 0 END) as paies_en_attente,
                SUM(CASE WHEN statut = ? THEN 1 ELSE 0 END) as paies_validees,
                SUM(CASE WHEN statut = ? THEN 1 ELSE 0 END) as paies_payees
            ", [
                StatutPaie::GENERE->value,
                StatutPaie::VALIDE->value,
                StatutPaie::PAYE->value
            ])
            ->first();

        // Get total count across all time
        $totalPaies = $this->model->count();

        return [
            'total_paies' => $totalPaies,
            'total_masse_salariale' => round($currentMonthStats->total_brut ?? 0, 2),
            'total_net_mensuel' => round($currentMonthStats->total_net ?? 0, 2),
            'total_cnss_mensuel' => round($currentMonthStats->total_cnss ?? 0, 2),
            'total_impot_mensuel' => round($currentMonthStats->total_impot ?? 0, 2),
            'total_deductions_mensuel' => round($currentMonthStats->total_deductions ?? 0, 2),
            'paies_en_attente' => $statusCounts->paies_en_attente ?? 0,
            'paies_validees' => $statusCounts->paies_validees ?? 0,
            'paies_payees' => $statusCounts->paies_payees ?? 0,
            'paies_mois_courant' => $currentMonthStats->paies_count ?? 0,
        ];
    }

    public function getByStatut(StatutPaie $statut): Collection
    {
        return $this->model->byStatut($statut)
            ->with('utilisateur')
            ->orderBy('created_at', 'desc')
            ->get();
    }
}
