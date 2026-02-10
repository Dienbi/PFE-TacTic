<?php

namespace App\Services;

use App\Enums\EmployeStatus;
use App\Enums\StatutConge;
use App\Events\LeaveStatusNotification;
use App\Models\Conge;
use App\Repositories\CongeRepository;
use App\Repositories\UtilisateurRepository;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class CongeService
{
    public function __construct(
        protected CongeRepository $congeRepository,
        protected UtilisateurRepository $utilisateurRepository,
        protected LeaveConflictService $leaveConflictService
    ) {}

    public function getAll(): Collection
    {
        // Enrich leaves with conflict data
        $leaves = $this->congeRepository->all();
        foreach ($leaves as $leave) {
            $leave->conflicts = $this->leaveConflictService->checkConflicts($leave);
        }
        return $leaves;
    }

    public function getById(int $id): ?Conge
    {
        $leave = $this->congeRepository->find($id);
        if ($leave) {
            $leave->conflicts = $this->leaveConflictService->checkConflicts($leave);
        }
        return $leave;
    }


    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->congeRepository->getByUtilisateur($utilisateurId);
    }

    public function getEnAttente(): Collection
    {
        $leaves = $this->congeRepository->getEnAttente();
        foreach ($leaves as $leave) {
            $leave->conflicts = $this->leaveConflictService->checkConflicts($leave);
        }
        return $leaves;
    }

    public function getEnAttenteByEquipe(int $equipeId): Collection
    {
        $leaves = $this->congeRepository->getEnAttenteByEquipe($equipeId);
        foreach ($leaves as $leave) {
            $leave->conflicts = $this->leaveConflictService->checkConflicts($leave);
        }
        return $leaves;
    }

    public function demander(int $utilisateurId, array $data): Conge|array
    {
        $dateDebut = Carbon::parse($data['date_debut']);
        $dateFin = Carbon::parse($data['date_fin']);

        // Check for conflicts
        if ($this->congeRepository->hasConflict($utilisateurId, $dateDebut, $dateFin)) {
            return ['error' => 'Vous avez déjà une demande de congé pour cette période.'];
        }

        // Check solde conge
        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);
        $nombreJours = $dateDebut->diffInDays($dateFin) + 1;

        if ($data['type'] !== 'SANS_SOLDE' && $utilisateur->solde_conge < $nombreJours) {
            return ['error' => 'Solde de congé insuffisant.'];
        }

        // Validate medical file for sick leave
        if ($data['type'] === 'MALADIE' && empty($data['medical_file'])) {
            return ['error' => 'Un certificat médical est requis pour les congés maladie.'];
        }

        return $this->congeRepository->create([
            'utilisateur_id' => $utilisateurId,
            'type' => $data['type'],
            'date_debut' => $dateDebut,
            'date_fin' => $dateFin,
            'motif' => $data['motif'] ?? null,
            'medical_file' => $data['medical_file'] ?? null,
            'statut' => StatutConge::EN_ATTENTE,
        ]);
    }

    public function approuver(int $congeId, int $approuveParId): bool
    {
        $conge = $this->congeRepository->findOrFail($congeId);

        // Deduct leave days
        if ($conge->type !== 'SANS_SOLDE') {
            $this->utilisateurRepository->updateSoldeConge(
                $conge->utilisateur_id,
                $conge->nombre_jours
            );
        }

        // Update user status
        $this->utilisateurRepository->updateStatus(
            $conge->utilisateur_id,
            EmployeStatus::EN_CONGE
        );

        $result = $this->congeRepository->approuver($congeId, $approuveParId);

        // Broadcast notification to user
        if ($result) {
            \Log::info('Broadcasting LeaveStatusNotification to user: ' . $conge->utilisateur_id);

            try {
                event(new LeaveStatusNotification(
                    $conge->utilisateur_id,
                    'success',
                    'Leave Approved',
                    'Your leave request from ' . $conge->date_debut->format('d/m/Y') . ' to ' . $conge->date_fin->format('d/m/Y') . ' has been approved.',
                    ['conge_id' => $congeId]
                ));
                \Log::info('LeaveStatusNotification dispatched successfully');
            } catch (\Exception $e) {
                \Log::error('Failed to broadcast: ' . $e->getMessage());
            }
        }

        return $result;
    }

    public function refuser(int $congeId, int $approuveParId, ?string $motifRefus = null): bool
    {
        $conge = $this->congeRepository->findOrFail($congeId);

        // Update rejection reason
        if ($motifRefus) {
            $conge->motif_refus = $motifRefus;
            $conge->save();
        }

        $result = $this->congeRepository->refuser($congeId, $approuveParId);

        // Broadcast notification to user
        if ($result) {
            event(new LeaveStatusNotification(
                $conge->utilisateur_id,
                'warning',
                'Leave Rejected',
                'Your leave request has been rejected.' . ($motifRefus ? " Reason: $motifRefus" : ''),
                [
                    'conge_id' => $congeId,
                    'reason' => $motifRefus
                ]
            ));
        }

        return $result;
    }

    public function annuler(int $congeId): bool
    {
        $conge = $this->congeRepository->findOrFail($congeId);

        if ($conge->statut !== StatutConge::EN_ATTENTE) {
            return false;
        }

        return $this->congeRepository->delete($congeId);
    }

    public function getByPeriod(Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->congeRepository->getByPeriod($startDate, $endDate);
    }
}
