<?php

namespace App\Services;

use App\Contracts\Repositories\PointageRepositoryInterface;
use App\Contracts\Repositories\UtilisateurRepositoryInterface;
use App\Models\Pointage;
use App\Events\AttendanceNotification;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class PointageService
{
    public function __construct(
        protected PointageRepositoryInterface $pointageRepository,
        protected UtilisateurRepositoryInterface $utilisateurRepository
    ) {}

    public function getSummary(Carbon $date): array
    {
        $todayPointages = $this->pointageRepository->getByDate($date);
        $allUsers = $this->utilisateurRepository->getActifs();

        $presentIds = $todayPointages->pluck('utilisateur_id')->toArray();

        $present = [];
        $late = [];
        $absent = [];
        $currentlyIn = [];

        // Configurable start time (e.g. 09:00)
        $msgStartTime = $date->copy()->setTime(9, 15); // 15 mins grace period

        foreach ($todayPointages as $pointage) {
            $user = $pointage->utilisateur;
            if (!$user) continue;

            $userInfo = [
                'id' => $user->id,
                'nom' => $user->nom,
                'prenom' => $user->prenom,
                'email' => $user->email,
                'matricule' => $user->matricule,
                'poste' => $user->poste,
                'heure_entree' => $pointage->heure_entree ? Carbon::parse($pointage->heure_entree)->format('H:i') : null,
                'heure_sortie' => $pointage->heure_sortie ? Carbon::parse($pointage->heure_sortie)->format('H:i') : null,
                'status' => 'PRESENT'
            ];

            $present[] = $userInfo;

            // Check if currently checked in
            if ($pointage->heure_entree && !$pointage->heure_sortie) {
                $currentlyIn[] = $userInfo;
            }

            // Check if late
            if ($pointage->heure_entree && Carbon::parse($pointage->heure_entree)->gt($msgStartTime)) {
                $userInfo['status'] = 'LATE';
                $late[] = $userInfo;
            }
        }

        foreach ($allUsers as $user) {
            if (!in_array($user->id, $presentIds)) {
                $absent[] = [
                    'id' => $user->id,
                    'nom' => $user->nom,
                    'prenom' => $user->prenom,
                    'email' => $user->email,
                    'matricule' => $user->matricule,
                    'poste' => $user->poste,
                    'status' => 'ABSENT'
                ];
            }
        }

        return [
            'date' => $date->format('Y-m-d'),
            'stats' => [
                'total_employees' => $allUsers->count(),
                'present_count' => count($present),
                'late_count' => count($late),
                'absent_count' => count($absent),
                'currently_in_count' => count($currentlyIn),
            ],
            'lists' => [
                'present' => $present,
                'late' => $late,
                'absent' => $absent,
                'currently_in' => $currentlyIn
            ]
        ];
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->pointageRepository->getByUtilisateur($utilisateurId);
    }

    public function getByDate(Carbon $date): Collection
    {
        return $this->pointageRepository->getByDate($date);
    }

    public function getByPeriod(int $utilisateurId, Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->pointageRepository->getByPeriod($utilisateurId, $startDate, $endDate);
    }

    public function getTodayPointage(int $utilisateurId): ?Pointage
    {
        return $this->pointageRepository->getTodayPointage($utilisateurId);
    }

    public function pointerEntree(int $utilisateurId): Pointage
    {
        $pointage = $this->pointageRepository->pointer($utilisateurId, 'entree');

        // Log the check-in activity
        $user = \App\Models\Utilisateur::find($utilisateurId);
        if ($user) {
            ActivityLogger::log(
                'CHECK_IN',
                "{$user->prenom} {$user->nom} a pointé son entrée à " . Carbon::now()->format('H:i'),
                $utilisateurId
            );

            // Check if late (after 09:15)
            $lateThreshold = Carbon::today()->setTime(9, 15);
            $isLate = Carbon::now()->gt($lateThreshold);

            // Broadcast to RH
            try {
                event(new AttendanceNotification(
                    $isLate ? 'warning' : 'info',
                    $isLate ? 'Late Check-in' : 'Check-in',
                    "{$user->prenom} {$user->nom} checked in at " . Carbon::now()->format('H:i') . ($isLate ? ' (late)' : ''),
                    [
                        'user_id' => $user->id,
                        'user_name' => "{$user->prenom} {$user->nom}",
                        'time' => Carbon::now()->format('H:i'),
                        'is_late' => $isLate,
                        'action' => 'check_in'
                    ]
                ));
            } catch (\Exception $e) {
                \Log::warning('Broadcast failed for AttendanceNotification: ' . $e->getMessage());
            }
        }

        return $pointage;
    }

    public function pointerSortie(int $utilisateurId, bool $isAutoCheckout = false): Pointage
    {
        $pointage = $this->pointageRepository->pointer($utilisateurId, 'sortie');

        // Log the check-out activity
        $user = \App\Models\Utilisateur::find($utilisateurId);
        if ($user) {
            $message = $isAutoCheckout
                ? "{$user->prenom} {$user->nom} - checkout automatique à " . Carbon::now()->format('H:i')
                : "{$user->prenom} {$user->nom} a pointé sa sortie à " . Carbon::now()->format('H:i');

            ActivityLogger::log(
                $isAutoCheckout ? 'AUTO_CHECK_OUT' : 'CHECK_OUT',
                $message,
                $utilisateurId
            );

            // Broadcast to RH
            try {
                event(new AttendanceNotification(
                    'info',
                    'Check-out',
                    "{$user->prenom} {$user->nom} checked out at " . Carbon::now()->format('H:i'),
                    [
                        'user_id' => $user->id,
                        'user_name' => "{$user->prenom} {$user->nom}",
                        'time' => Carbon::now()->format('H:i'),
                        'is_auto' => $isAutoCheckout,
                        'action' => 'check_out'
                    ]
                ));
            } catch (\Exception $e) {
                \Log::warning('Broadcast failed for AttendanceNotification: ' . $e->getMessage());
            }
        }

        return $pointage;
    }

    public function marquerAbsence(int $utilisateurId, Carbon $date, bool $justifiee = false): Pointage
    {
        return $this->pointageRepository->create([
            'utilisateur_id' => $utilisateurId,
            'date' => $date,
            'absence_justifiee' => $justifiee,
        ]);
    }

    public function justifierAbsence(int $pointageId): bool
    {
        return $this->pointageRepository->update($pointageId, ['absence_justifiee' => true]);
    }

    public function getStats(int $utilisateurId, Carbon $startDate, Carbon $endDate): array
    {
        return $this->pointageRepository->getStatsByPeriod($utilisateurId, $startDate, $endDate);
    }

    public function getAbsences(int $utilisateurId, Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->pointageRepository->getAbsences($utilisateurId, $startDate, $endDate);
    }

    public function update(int $id, array $data): bool
    {
        return $this->pointageRepository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->pointageRepository->delete($id);
    }
}
