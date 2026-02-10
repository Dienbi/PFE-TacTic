<?php

namespace App\Services;

use App\Models\Conge;
use App\Models\Utilisateur;
use App\Enums\StatutConge;
use App\Enums\Role;
use Carbon\Carbon;

class LeaveConflictService
{
    /**
     * Check for conflicts for a specific leave request
     * 
     * @param Conge $conge The leave request to check
     * @return array Array of conflicts found, each with 'type' and 'message'
     */
    public function checkConflicts(Conge $conge): array
    {
        $conflicts = [];
        $user = $conge->utilisateur;
        
        if (!$user || !$user->equipe_id) {
            return $conflicts;
        }

        $startDate = $conge->date_debut;
        $endDate = $conge->date_fin;

        // Rule 1: Team Capacity (> 30% absent)
        $this->checkTeamCapacity($user, $startDate, $endDate, $conflicts);

        // Rule 2 & 3: Manager/Employee Overlap
        if ($user->role === Role::CHEF_EQUIPE) {
            $this->checkManagerVsTeamOverlap($user, $startDate, $endDate, $conflicts);
        } else {
            $this->checkEmployeeVsManagerOverlap($user, $startDate, $endDate, $conflicts);
        }

        return $conflicts;
    }

    private function checkTeamCapacity(Utilisateur $user, Carbon $start, Carbon $end, array &$conflicts): void
    {
        $teamId = $user->equipe_id;
        
        // Get total team size (active members)
        $totalTeamSize = Utilisateur::where('equipe_id', $teamId)
            ->where('actif', true)
            ->count();

        if ($totalTeamSize === 0) return;

        // Count members on leave during this period (Status APPROVED)
        // We look for any overlapping approved leave
        $membersOnLeave = Conge::whereHas('utilisateur', function($q) use ($teamId) {
                $q->where('equipe_id', $teamId);
            })
            ->where('statut', StatutConge::APPROUVE)
            ->where(function($query) use ($start, $end) {
                $query->whereBetween('date_debut', [$start, $end])
                    ->orWhereBetween('date_fin', [$start, $end])
                    ->orWhere(function($q) use ($start, $end) {
                        $q->where('date_debut', '<', $start)
                            ->where('date_fin', '>', $end);
                    });
            })
            ->count();
        
        // Add current request to the count (hypothetically if approved)
        // Wait, if 30% ALREADY exceeded, this is a conflict. 
        // If 29% + this one > 30%, is it a conflict? Usually yes.
        // Let's count existing + 1.
        $projectedAbsent = $membersOnLeave + 1;
        
        $percentage = ($projectedAbsent / $totalTeamSize) * 100;

        if ($percentage > 30) {
            $conflicts[] = [
                'type' => 'TEAM_CAPACITY',
                'message' => "Approving this would result in {$percentage}% of the team being absent (Limit: 30%). Currently {$membersOnLeave} members are approved for leave.",
                'severity' => 'high'
            ];
        }
    }

    private function checkManagerVsTeamOverlap(Utilisateur $manager, Carbon $start, Carbon $end, array &$conflicts): void
    {
        // Check if ANY team member has approved leave
        $hasMemberOnLeave = Conge::whereHas('utilisateur', function($q) use ($manager) {
                $q->where('equipe_id', $manager->equipe_id)
                  ->where('id', '!=', $manager->id); // Exclude self just in case
            })
            ->where('statut', StatutConge::APPROUVE)
            ->where(function($query) use ($start, $end) {
                $query->whereBetween('date_debut', [$start, $end])
                    ->orWhereBetween('date_fin', [$start, $end])
                    ->orWhere(function($q) use ($start, $end) {
                        $q->where('date_debut', '<', $start)
                            ->where('date_fin', '>', $end);
                    });
            })
            ->exists();

        if ($hasMemberOnLeave) {
            $conflicts[] = [
                'type' => 'MANAGER_MEMBER_OVERLAP',
                'message' => "A team member is already on leave during this period.",
                'severity' => 'warning'
            ];
        }
    }

    private function checkEmployeeVsManagerOverlap(Utilisateur $employee, Carbon $start, Carbon $end, array &$conflicts): void
    {
        // Find the manager of this team
        $manager = Utilisateur::where('equipe_id', $employee->equipe_id)
            ->where('role', Role::CHEF_EQUIPE)
            ->first();

        if (!$manager) return;

        // Check if manager has approved leave
        $managerOnLeave = Conge::where('utilisateur_id', $manager->id)
            ->where('statut', StatutConge::APPROUVE)
            ->where(function($query) use ($start, $end) {
                $query->whereBetween('date_debut', [$start, $end])
                    ->orWhereBetween('date_fin', [$start, $end])
                    ->orWhere(function($q) use ($start, $end) {
                        $q->where('date_debut', '<', $start)
                            ->where('date_fin', '>', $end);
                    });
            })
            ->exists();

        if ($managerOnLeave) {
            $conflicts[] = [
                'type' => 'EMPLOYEE_MANAGER_OVERLAP',
                'message' => "The Team Manager ({$manager->nom} {$manager->prenom}) is on leave during this period.",
                'severity' => 'warning'
            ];
        }
    }
}
