<?php

namespace App\Services;

use App\Models\Paie;
use App\Repositories\PaieRepository;
use App\Repositories\PointageRepository;
use App\Repositories\UtilisateurRepository;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class PaieService
{
    public function __construct(
        protected PaieRepository $paieRepository,
        protected UtilisateurRepository $utilisateurRepository,
        protected PointageRepository $pointageRepository
    ) {}

    public function getAll(): Collection
    {
        return $this->paieRepository->all();
    }

    public function getById(int $id): ?Paie
    {
        return $this->paieRepository->find($id);
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->paieRepository->getByUtilisateur($utilisateurId);
    }

    public function getByPeriod(Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->paieRepository->getByPeriod($startDate, $endDate);
    }

    public function generer(int $utilisateurId, Carbon $periodeDebut, Carbon $periodeFin): Paie|array
    {
        // Check if already exists
        if ($this->paieRepository->existsForPeriod($utilisateurId, $periodeDebut, $periodeFin)) {
            return ['error' => 'Une paie existe déjà pour cette période.'];
        }

        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);

        // Calculate based on attendance
        $stats = $this->pointageRepository->getStatsByPeriod($utilisateurId, $periodeDebut, $periodeFin);

        $salaireBrut = $utilisateur->salaire_base;
        $heuresSupp = max(0, $stats['total_heures'] - 160); // 160h standard par mois
        $tauxHoraire = $salaireBrut / 160;
        $montantHeuresSupp = $heuresSupp * $tauxHoraire * 1.25; // 25% bonus

        // Deductions (simplified - 23% social charges)
        $deductions = ($salaireBrut + $montantHeuresSupp) * 0.23;

        $salaireNet = $salaireBrut + $montantHeuresSupp - $deductions;

        return $this->paieRepository->create([
            'utilisateur_id' => $utilisateurId,
            'periode_debut' => $periodeDebut,
            'periode_fin' => $periodeFin,
            'salaire_brut' => $salaireBrut,
            'deductions' => $deductions,
            'heures_supp' => $heuresSupp,
            'salaire_net' => $salaireNet,
        ]);
    }

    public function genererPourTous(Carbon $periodeDebut, Carbon $periodeFin): array
    {
        $utilisateurs = $this->utilisateurRepository->getActifs();
        $results = ['success' => [], 'errors' => []];

        foreach ($utilisateurs as $utilisateur) {
            $paie = $this->generer($utilisateur->id, $periodeDebut, $periodeFin);

            if (is_array($paie) && isset($paie['error'])) {
                $results['errors'][] = [
                    'utilisateur_id' => $utilisateur->id,
                    'error' => $paie['error'],
                ];
            } else {
                $results['success'][] = $paie;
            }
        }

        return $results;
    }

    public function marquerPayee(int $paieId): bool
    {
        return $this->paieRepository->marquerPayee($paieId);
    }

    public function getNonPayees(): Collection
    {
        return $this->paieRepository->getNonPayees();
    }

    public function getStats(int $utilisateurId): array
    {
        return $this->paieRepository->getStatsByUtilisateur($utilisateurId);
    }

    public function getTotalSalaires(int $year, int $month): float
    {
        return $this->paieRepository->getTotalSalairesParMois($year, $month);
    }

    public function update(int $id, array $data): bool
    {
        return $this->paieRepository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->paieRepository->delete($id);
    }
}
