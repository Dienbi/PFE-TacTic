<?php

namespace App\Services;

use App\Enums\Role;
use App\Enums\StatutConge;
use App\Models\Conge;
use App\Models\Equipe;
use App\Repositories\EquipeRepository;
use App\Repositories\UtilisateurRepository;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class EquipeService
{
    public function __construct(
        protected EquipeRepository $equipeRepository,
        protected UtilisateurRepository $utilisateurRepository
    ) {}

    public function getAll(): Collection
    {
        return $this->equipeRepository->getAllWithCounts();
    }

    public function getAllWithRelations(): Collection
    {
        return $this->equipeRepository->getAllWithRelations();
    }

    public function getById(int $id): ?Equipe
    {
        return $this->equipeRepository->getWithMembres($id);
    }

    public function getMyTeam(int $chefId): ?Equipe
    {
        return $this->equipeRepository->getWithMembresByChef($chefId);
    }

    public function create(array $data): Equipe
    {
        return $this->equipeRepository->create($data);
    }

    public function update(int $id, array $data): bool
    {
        return $this->equipeRepository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        // Remove all members from team first
        $equipe = $this->equipeRepository->getWithMembres($id);
        foreach ($equipe->membres as $membre) {
            $this->utilisateurRepository->update($membre->id, ['equipe_id' => null]);
        }

        return $this->equipeRepository->delete($id);
    }

    public function assignChef(int $equipeId, int $chefId): bool
    {
        return $this->equipeRepository->assignChef($equipeId, $chefId);
    }

    public function removeChef(int $equipeId): bool
    {
        return $this->equipeRepository->removeChef($equipeId);
    }

    public function addMembre(int $equipeId, int $utilisateurId): bool
    {
        return $this->utilisateurRepository->update($utilisateurId, ['equipe_id' => $equipeId]);
    }

    public function removeMembre(int $utilisateurId): bool
    {
        return $this->utilisateurRepository->update($utilisateurId, ['equipe_id' => null]);
    }

    public function getMembres(int $equipeId): Collection
    {
        return $this->utilisateurRepository->getByEquipe($equipeId);
    }

    /**
     * Get available managers for team assignment
     * Excludes managers already assigned to a team or on long leave
     */
    public function getAvailableManagers(): array
    {
        $managers = $this->utilisateurRepository->getByRole(Role::CHEF_EQUIPE);

        return $this->filterAvailableUsers($managers);
    }

    /**
     * Get available employees for team assignment
     * Excludes employees already assigned to a team or on long leave
     */
    public function getAvailableEmployees(): array
    {
        $employees = $this->utilisateurRepository->getByRole(Role::EMPLOYE);

        return $this->filterAvailableUsers($employees);
    }

    /**
     * Filter users based on availability (team assignment and leave status)
     */
    protected function filterAvailableUsers(Collection $users): array
    {
        $result = [];
        $today = Carbon::today();

        foreach ($users as $user) {
            // Skip users already assigned to a team
            if ($user->equipe_id !== null) {
                continue;
            }

            // Check for active approved leaves
            $activeLeave = Conge::where('utilisateur_id', $user->id)
                ->where('statut', StatutConge::APPROUVE)
                ->where('date_debut', '<=', $today)
                ->where('date_fin', '>=', $today)
                ->first();

            // Check for upcoming approved leaves starting within the next month
            $upcomingLeave = Conge::where('utilisateur_id', $user->id)
                ->where('statut', StatutConge::APPROUVE)
                ->where('date_debut', '>', $today)
                ->where('date_debut', '<=', $today->copy()->addMonth())
                ->orderBy('date_debut')
                ->first();

            $leaveInfo = null;
            $leaveDuration = 0;

            if ($activeLeave) {
                $leaveDuration = $activeLeave->date_debut->diffInDays($activeLeave->date_fin) + 1;

                // If leave is more than 7 days, skip this user
                if ($leaveDuration > 7) {
                    continue;
                }

                $leaveInfo = [
                    'on_leave' => true,
                    'leave_type' => $activeLeave->type->value,
                    'leave_end' => $activeLeave->date_fin->format('Y-m-d'),
                    'duration' => $leaveDuration,
                    'message' => "En congé jusqu'au " . $activeLeave->date_fin->format('d/m/Y') . " ({$leaveDuration} jours)"
                ];
            } elseif ($upcomingLeave) {
                $leaveDuration = $upcomingLeave->date_debut->diffInDays($upcomingLeave->date_fin) + 1;

                // Show notice for upcoming short leave
                if ($leaveDuration <= 7) {
                    $leaveInfo = [
                        'on_leave' => false,
                        'upcoming_leave' => true,
                        'leave_type' => $upcomingLeave->type->value,
                        'leave_start' => $upcomingLeave->date_debut->format('Y-m-d'),
                        'leave_end' => $upcomingLeave->date_fin->format('Y-m-d'),
                        'duration' => $leaveDuration,
                        'message' => "Congé prévu du " . $upcomingLeave->date_debut->format('d/m/Y') . " au " . $upcomingLeave->date_fin->format('d/m/Y')
                    ];
                }
            }

            $result[] = [
                'id' => $user->id,
                'nom' => $user->nom,
                'prenom' => $user->prenom,
                'email' => $user->email,
                'matricule' => $user->matricule,
                'role' => $user->role->value,
                'status' => $user->status->value,
                'leave_info' => $leaveInfo
            ];
        }

        return $result;
    }
}
