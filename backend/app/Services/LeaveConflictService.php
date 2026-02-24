<?php

namespace App\Services;

use App\Models\Conge;
use App\Models\Utilisateur;
use App\Enums\StatutConge;
use App\Enums\Role;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class LeaveConflictService
{
    /**
     * Check for conflicts for a specific leave request
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

        $this->checkTeamCapacity($user, $startDate, $endDate, $conflicts);

        if ($user->role === Role::CHEF_EQUIPE) {
            $this->checkManagerVsTeamOverlap($user, $startDate, $endDate, $conflicts);
        } else {
            $this->checkEmployeeVsManagerOverlap($user, $startDate, $endDate, $conflicts);
        }

        return $conflicts;
    }

    /**
     * Check conflicts for many leaves at once (batch optimized).
     * Pre-fetches all needed data to avoid N+1 queries.
     *
     * @param Collection $leaves Collection of Conge with utilisateur already eager-loaded
     * @return array Keyed by conge id => array of conflicts
     */
    public function checkConflictsForMany(Collection $leaves): array
    {
        $result = [];

        if ($leaves->isEmpty()) {
            return $result;
        }

        // Collect all unique team IDs from the leaves
        $teamIds = $leaves->pluck('utilisateur.equipe_id')->filter()->unique()->values()->toArray();

        if (empty($teamIds)) {
            foreach ($leaves as $leave) {
                $result[$leave->id] = [];
            }
            return $result;
        }

        // Batch fetch: team sizes for all teams
        $teamSizes = Utilisateur::whereIn('equipe_id', $teamIds)
            ->where('actif', true)
            ->selectRaw('equipe_id, COUNT(*) as cnt')
            ->groupBy('equipe_id')
            ->pluck('cnt', 'equipe_id');

        // Batch fetch: managers for all teams
        $managers = Utilisateur::whereIn('equipe_id', $teamIds)
            ->where('role', Role::CHEF_EQUIPE)
            ->get()
            ->keyBy('equipe_id');

        // Find the global date range across all leaves for one overlap query
        $globalStart = $leaves->min('date_debut');
        $globalEnd = $leaves->max('date_fin');

        // Batch fetch: all approved leaves that overlap the global date range for these teams
        // Use JOIN instead of whereHas to avoid a correlated subquery (much faster in PostgreSQL)
        $overlappingLeaves = Conge::join('utilisateurs', 'conges.utilisateur_id', '=', 'utilisateurs.id')
            ->whereIn('utilisateurs.equipe_id', $teamIds)
            ->where('conges.statut', StatutConge::APPROUVE)
            ->where(function ($query) use ($globalStart, $globalEnd) {
                $query->whereBetween('conges.date_debut', [$globalStart, $globalEnd])
                    ->orWhereBetween('conges.date_fin', [$globalStart, $globalEnd])
                    ->orWhere(function ($q) use ($globalStart, $globalEnd) {
                        $q->where('conges.date_debut', '<', $globalStart)
                            ->where('conges.date_fin', '>', $globalEnd);
                    });
            })
            ->select('conges.*')
            ->with('utilisateur:id,equipe_id,role,nom,prenom')
            ->get();

        // Index overlapping leaves by team
        $overlapsByTeam = $overlappingLeaves->groupBy('utilisateur.equipe_id');

        foreach ($leaves as $leave) {
            $conflicts = [];
            $user = $leave->utilisateur;

            if (!$user || !$user->equipe_id) {
                $result[$leave->id] = [];
                continue;
            }

            $teamId = $user->equipe_id;
            $start = $leave->date_debut;
            $end = $leave->date_fin;
            $totalTeamSize = $teamSizes[$teamId] ?? 0;

            // Filter overlapping leaves for THIS leave's date range and team
            $teamOverlaps = ($overlapsByTeam[$teamId] ?? collect())->filter(function ($ol) use ($start, $end) {
                return $ol->date_debut <= $end && $ol->date_fin >= $start;
            });

            // Rule 1: Team Capacity
            if ($totalTeamSize > 0) {
                $membersOnLeave = $teamOverlaps->pluck('utilisateur_id')->unique()->count();
                $projectedAbsent = $membersOnLeave + 1;
                $percentage = round(($projectedAbsent / $totalTeamSize) * 100, 1);

                if ($percentage > 30) {
                    $conflicts[] = [
                        'type' => 'TEAM_CAPACITY',
                        'message' => "Approving this would result in {$percentage}% of the team being absent (Limit: 30%). Currently {$membersOnLeave} members are approved for leave.",
                        'severity' => 'high',
                    ];
                }
            }

            // Rule 2 & 3: Manager/Employee overlap
            if ($user->role === Role::CHEF_EQUIPE) {
                $hasMemberOnLeave = $teamOverlaps->contains(function ($ol) use ($user) {
                    return $ol->utilisateur_id !== $user->id;
                });
                if ($hasMemberOnLeave) {
                    $conflicts[] = [
                        'type' => 'MANAGER_MEMBER_OVERLAP',
                        'message' => 'A team member is already on leave during this period.',
                        'severity' => 'warning',
                    ];
                }
            } else {
                $manager = $managers[$teamId] ?? null;
                if ($manager) {
                    $managerOnLeave = $teamOverlaps->contains('utilisateur_id', $manager->id);
                    if ($managerOnLeave) {
                        $conflicts[] = [
                            'type' => 'EMPLOYEE_MANAGER_OVERLAP',
                            'message' => "The Team Manager ({$manager->nom} {$manager->prenom}) is on leave during this period.",
                            'severity' => 'warning',
                        ];
                    }
                }
            }

            $result[$leave->id] = $conflicts;
        }

        return $result;
    }

    private function checkTeamCapacity(Utilisateur $user, Carbon $start, Carbon $end, array &$conflicts): void
    {
        $teamId = $user->equipe_id;

        $totalTeamSize = Utilisateur::where('equipe_id', $teamId)
            ->where('actif', true)
            ->count();

        if ($totalTeamSize === 0) return;

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
        $hasMemberOnLeave = Conge::whereHas('utilisateur', function($q) use ($manager) {
                $q->where('equipe_id', $manager->equipe_id)
                  ->where('id', '!=', $manager->id);
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
        $manager = Utilisateur::where('equipe_id', $employee->equipe_id)
            ->where('role', Role::CHEF_EQUIPE)
            ->first();

        if (!$manager) return;

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
