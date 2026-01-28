<?php

namespace App\Repositories;

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
            ->get();
    }

    public function marquerPayee(int $paieId): bool
    {
        return $this->update($paieId, ['date_paiement' => Carbon::now()]);
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
            'total_brut' => $paies->sum('salaire_brut'),
            'total_net' => $paies->sum('salaire_net'),
            'total_deductions' => $paies->sum('deductions'),
            'moyenne_net' => $paies->avg('salaire_net'),
            'nombre_paies' => $paies->count(),
        ];
    }
}
