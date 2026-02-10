<?php

namespace App\Repositories;

use App\Enums\StatutPaie;
use App\Models\Paie;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class PaieRepository extends BaseRepository
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

    public function getGlobalStats(): array
    {
        $currentMonth = Carbon::now();
        $startOfMonth = $currentMonth->copy()->startOfMonth();
        $endOfMonth = $currentMonth->copy()->endOfMonth();

        $allPaies = $this->model->with('utilisateur')->get();
        $currentMonthPaies = $this->model
            ->whereYear('periode_debut', $currentMonth->year)
            ->whereMonth('periode_debut', $currentMonth->month)
            ->get();

        return [
            'total_paies' => $allPaies->count(),
            'total_masse_salariale' => round($currentMonthPaies->sum('salaire_brut'), 2),
            'total_net_mensuel' => round($currentMonthPaies->sum('salaire_net'), 2),
            'total_cnss_mensuel' => round($currentMonthPaies->sum('cnss_employe'), 2),
            'total_impot_mensuel' => round($currentMonthPaies->sum('impot_mensuel'), 2),
            'total_deductions_mensuel' => round($currentMonthPaies->sum('deductions'), 2),
            'paies_en_attente' => $this->model->where('statut', StatutPaie::GENERE)->count(),
            'paies_validees' => $this->model->where('statut', StatutPaie::VALIDE)->count(),
            'paies_payees' => $this->model->where('statut', StatutPaie::PAYE)->count(),
            'paies_mois_courant' => $currentMonthPaies->count(),
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
