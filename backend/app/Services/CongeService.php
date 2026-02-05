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
        protected UtilisateurRepository $utilisateurRepository
    ) {}

    public function getAll(): Collection
    {
        return $this->congeRepository->all();
    }

    public function getById(int $id): ?Conge
    {
        return $this->congeRepository->find($id);
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->congeRepository->getByUtilisateur($utilisateurId);
    }

    public function getEnAttente(): Collection
    {
        return $this->congeRepository->getEnAttente();
    }

    public function getEnAttenteByEquipe(int $equipeId): Collection
    {
        return $this->congeRepository->getEnAttenteByEquipe($equipeId);
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

    public function refuser(int $congeId, int $approuveParId): bool
    {
        $conge = $this->congeRepository->findOrFail($congeId);
        $result = $this->congeRepository->refuser($congeId, $approuveParId);

        // Broadcast notification to user
        if ($result) {
            event(new LeaveStatusNotification(
                $conge->utilisateur_id,
                'warning',
                'Leave Rejected',
                'Your leave request from ' . $conge->date_debut->format('d/m/Y') . ' to ' . $conge->date_fin->format('d/m/Y') . ' has been rejected.',
                ['conge_id' => $congeId]
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
