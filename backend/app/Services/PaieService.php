<?php

namespace App\Services;

use App\Contracts\Repositories\PaieRepositoryInterface;
use App\Contracts\Repositories\PointageRepositoryInterface;
use App\Contracts\Repositories\UtilisateurRepositoryInterface;
use App\Enums\StatutPaie;
use App\Models\Paie;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class PaieService
{
    public function __construct(
        protected PaieRepositoryInterface $paieRepository,
        protected UtilisateurRepositoryInterface $utilisateurRepository,
        protected PointageRepositoryInterface $pointageRepository,
        protected CacheService $cacheService,
        protected PayrollCalculator $payrollCalculator
    ) {}

    // ── CRUD ──────────────────────────────────────────────────────────

    public function getAll(): Collection
    {
        return $this->paieRepository->getAllWithUtilisateur();
    }

    public function getById(int $id): ?Paie
    {
        return $this->paieRepository->find($id)?->load('utilisateur');
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->paieRepository->getByUtilisateur($utilisateurId);
    }

    public function getByPeriod(Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->paieRepository->getByPeriod($startDate, $endDate);
    }

    public function update(int $id, array $data): bool
    {
        return $this->paieRepository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->paieRepository->delete($id);
    }

    // ── Salary configuration ──────────────────────────────────────────

    /**
     * HR configures an employee's base salary.
     */
    public function configurerSalaire(int $utilisateurId, float $salaireBase): array
    {
        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);

        $this->utilisateurRepository->update($utilisateurId, [
            'salaire_base' => $salaireBase,
        ]);

        $utilisateur->refresh();

        // Notify
        $this->notifySalaryConfigured($utilisateurId, $salaireBase);

        // Return a preview of what the payroll would look like
        $preview = $this->payrollCalculator->calculatePayroll($salaireBase, 0);

        return [
            'utilisateur' => $utilisateur,
            'preview' => $preview,
        ];
    }

    /**
     * Preview payroll calculation without persisting.
     */
    public function previewPaie(int $utilisateurId, Carbon $periodeDebut, Carbon $periodeFin): array
    {
        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);

        // Get attendance stats for the period
        $stats = $this->pointageRepository->getStatsByPeriod(
            $utilisateurId,
            $periodeDebut,
            $periodeFin
        );

        $standardHours = config('payroll.standard_monthly_hours', 173);
        $heuresSupp = max(0, $stats['total_heures'] - $standardHours);

        $calcul = $this->payrollCalculator->calculatePayroll($utilisateur->salaire_base, $heuresSupp);

        return array_merge($calcul, [
            'utilisateur' => $utilisateur,
            'heures_normales' => min($stats['total_heures'], $standardHours),
            'attendance_stats' => $stats,
            'periode_debut' => $periodeDebut->toDateString(),
            'periode_fin' => $periodeFin->toDateString(),
        ]);
    }

    // ── Payroll generation ────────────────────────────────────────────

    /**
     * Generate payroll for a single employee.
     */
    public function generer(int $utilisateurId, Carbon $periodeDebut, Carbon $periodeFin): Paie|array
    {
        // Check duplicate
        if ($this->paieRepository->existsForPeriod($utilisateurId, $periodeDebut, $periodeFin)) {
            return ['error' => 'Une fiche de paie existe déjà pour cette période.'];
        }

        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);

        if ($utilisateur->salaire_base <= 0) {
            return ['error' => 'Le salaire de base n\'est pas configuré pour cet employé.'];
        }

        // Calculate attendance-based overtime
        $stats = $this->pointageRepository->getStatsByPeriod(
            $utilisateurId,
            $periodeDebut,
            $periodeFin
        );

        $standardHours = config('payroll.standard_monthly_hours', 173);
        $heuresNormales = min($stats['total_heures'], $standardHours);
        $heuresSupp = max(0, $stats['total_heures'] - $standardHours);

        // Full calculation
        $calcul = $this->payrollCalculator->calculatePayroll($utilisateur->salaire_base, $heuresSupp);

        $paie = $this->paieRepository->create([
            'utilisateur_id' => $utilisateurId,
            'periode_debut' => $periodeDebut,
            'periode_fin' => $periodeFin,
            'salaire_brut' => $calcul['salaire_brut'],
            'taux_horaire' => $calcul['taux_horaire'],
            'heures_normales' => $heuresNormales,
            'heures_supp' => $calcul['heures_supp'],
            'montant_heures_supp' => $calcul['montant_heures_supp'],
            'deductions' => $calcul['deductions'],
            'cnss_employe' => $calcul['cnss_employe'],
            'cnss_taux' => $calcul['cnss_taux'],
            'impot_annuel' => $calcul['impot_annuel'],
            'impot_mensuel' => $calcul['impot_mensuel'],
            'salaire_net' => $calcul['salaire_net'],
            'statut' => StatutPaie::GENERE,
        ]);

        return $paie->load('utilisateur');
    }

    /**
     * Generate payrolls for all active employees.
     */
    public function genererPourTous(Carbon $periodeDebut, Carbon $periodeFin): array
    {
        $utilisateurs = $this->utilisateurRepository->getActifs();
        $results = ['success' => [], 'errors' => []];

        foreach ($utilisateurs as $utilisateur) {
            $paie = $this->generer($utilisateur->id, $periodeDebut, $periodeFin);

            if (is_array($paie) && isset($paie['error'])) {
                $results['errors'][] = [
                    'utilisateur_id' => $utilisateur->id,
                    'nom' => $utilisateur->nom_complet,
                    'error' => $paie['error'],
                ];
            } else {
                $results['success'][] = $paie;
            }
        }

        return $results;
    }

    // ── Workflow ───────────────────────────────────────────────────────

    public function valider(int $paieId): bool
    {
        return $this->paieRepository->valider($paieId);
    }

    public function marquerPayee(int $paieId): bool
    {
        $success = $this->paieRepository->marquerPayee($paieId);

        if ($success) {
            $paie = $this->getById($paieId);
            if ($paie && $paie->utilisateur) {
                // Log activity
                try {
                    if (class_exists(\App\Models\ActivityLog::class)) {
                        \App\Models\ActivityLog::create([
                            'user_id' => auth()->id() ?? null,
                            'action' => 'PAYROLL_PAID',
                            'description' => "Paiement du salaire de {$paie->utilisateur->prenom} {$paie->utilisateur->nom}",
                            'ip_address' => request()->ip(),
                        ]);
                    }
                } catch (\Throwable $e) {
                    // Log error if needed, but don't fail operation
                }

                // Fire Reverb Event (Realtime Toast)
                try {
                    \App\Events\SalaryPaid::dispatch($paie->utilisateur, $paie->salaire_net);
                } catch (\Throwable $e) {
                    // Ignore broadcast errors
                }
            }
        }

        return $success;
    }

    // ── Queries ───────────────────────────────────────────────────────

    public function getNonPayees(): Collection
    {
        return $this->paieRepository->getNonPayees();
    }

    public function getByStatut(string $statut): Collection
    {
        return $this->paieRepository->getByStatut(StatutPaie::from($statut));
    }

    // ── Statistics ────────────────────────────────────────────────────

    public function getStats(int $utilisateurId): array
    {
        return $this->paieRepository->getStatsByUtilisateur($utilisateurId);
    }

    public function getGlobalStats(): array
    {
        return $this->cacheService->getPayrollStats(
            fn() => $this->paieRepository->getGlobalStats()
        );
    }

    public function getTotalSalaires(int $year, int $month): float
    {
        return $this->paieRepository->getTotalSalairesParMois($year, $month);
    }

    /**
     * Get all employees with their salary configuration info.
     * Optimized to eliminate N+1 queries by fetching all last paies at once.
     */
    public function getEmployeesWithSalaryConfig(): array
    {
        $employees = $this->utilisateurRepository->getActifs();

        // Get all last paies at once to avoid N+1 queries
        $employeeIds = $employees->pluck('id')->toArray();
        $lastPaies = $this->paieRepository->getLastPaiesForUsers($employeeIds);

        return $employees->map(function ($emp) use ($lastPaies) {
            $lastPaie = $lastPaies[$emp->id] ?? null;
            $preview = $emp->salaire_base > 0
                ? $this->payrollCalculator->calculatePayroll($emp->salaire_base, 0)
                : null;

            return [
                'id' => $emp->id,
                'matricule' => $emp->matricule,
                'nom' => $emp->nom,
                'prenom' => $emp->prenom,
                'email' => $emp->email,
                'role' => $emp->role,
                'type_contrat' => $emp->type_contrat,
                'date_embauche' => $emp->date_embauche,
                'salaire_base' => $emp->salaire_base,
                'taux_horaire' => $preview ? $preview['taux_horaire'] : 0,
                'cnss_mensuel' => $preview ? $preview['cnss_employe'] : 0,
                'impot_mensuel' => $preview ? $preview['impot_mensuel'] : 0,
                'salaire_net_estime' => $preview ? $preview['salaire_net'] : 0,
                'derniere_paie' => $lastPaie,
            ];
        })->toArray();
    }

    /**
     * Simulate payroll for a given base salary (no user needed).
     */
    public function simuler(float $salaireBase, float $heuresSupp = 0): array
    {
        return $this->payrollCalculator->simulate($salaireBase, $heuresSupp);
    }

    /**
     * Get team payroll summary for a manager.
     */
    public function getTeamPayroll(int $managerId): array
    {
        $manager = $this->utilisateurRepository->findOrFail($managerId);
        $equipe = $manager->equipeGeree;

        if (!$equipe) {
            return ['error' => 'Aucune équipe gérée.'];
        }

        $members = $this->utilisateurRepository->getByEquipe($equipe->id);

        $result = [];
        foreach ($members as $member) {
            $lastPaie = $this->paieRepository->getLastPaie($member->id);
            $stats = $this->paieRepository->getStatsByUtilisateur($member->id);

            $result[] = [
                'utilisateur' => [
                    'id' => $member->id,
                    'matricule' => $member->matricule,
                    'nom' => $member->nom,
                    'prenom' => $member->prenom,
                    'role' => $member->role,
                ],
                'salaire_base' => $member->salaire_base,
                'derniere_paie' => $lastPaie,
                'stats' => $stats,
            ];
        }

        return [
            'equipe' => $equipe->nom ?? 'Mon équipe',
            'membres' => $result,
        ];
    }

    /**
     * Increase salary for all employees by a percentage.
     */
    public function augmenterSalaires(float $percentage): int
    {
        $count = 0;
        // Use chunk to handle large datasets efficiently
        \App\Models\Utilisateur::chunk(100, function ($users) use ($percentage, &$count) {
            foreach ($users as $user) {
                if ($user->salaire_base > 0) {
                    $oldSalary = $user->salaire_base;
                    // Increase logic: new = old * (1 + percent/100)
                    $user->salaire_base = round($oldSalary * (1 + $percentage / 100), 2);
                    $user->save();

                    // Notify user (database notification)
                    try {
                        $user->notify(new \App\Notifications\SalaireNotification(
                            "Votre salaire de base a été augmenté de {$percentage}%. Nouveau salaire: " . number_format($user->salaire_base, 2) . " TND",
                            'success'
                        ));
                    } catch (\Throwable $e) {
                        // Ignore notification errors to not break the transaction
                    }

                    $count++;
                }
            }
        });

        return $count;
    }

    public function notifySalaryConfigured(int $userId, float $salaire): void
    {
        $user = $this->utilisateurRepository->find($userId);
        if ($user) {
             try {
                $user->notify(new \App\Notifications\SalaireNotification(
                    "Votre salaire de base a été mis à jour: " . number_format($salaire, 2) . " TND",
                    'info'
                ));
            } catch (\Throwable $e) {}
        }
    }
}
