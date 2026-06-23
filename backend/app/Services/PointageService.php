<?php

namespace App\Services;

use App\Contracts\Repositories\PointageRepositoryInterface;
use App\Contracts\Repositories\UtilisateurRepositoryInterface;
use App\Events\AttendanceNotification;
use App\Models\Pointage;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class PointageService
{
    private const LATE_THRESHOLD = '09:15:00';

    private const MIN_LATE_COUNT = 3;

    private const MIN_ABSENCE_COUNT = 4;

    private const MIN_UNJUSTIFIED_ABSENCE_COUNT = 2;

    private const LOW_ATTENDANCE_RATIO = 0.6;

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
            if (! $user) {
                continue;
            }

            $userInfo = [
                'id' => $user->id,
                'nom' => $user->nom,
                'prenom' => $user->prenom,
                'email' => $user->email,
                'matricule' => $user->matricule,
                'poste' => $user->poste,
                'heure_entree' => $pointage->heure_entree ? Carbon::parse($pointage->heure_entree)->format('H:i') : null,
                'heure_sortie' => $pointage->heure_sortie ? Carbon::parse($pointage->heure_sortie)->format('H:i') : null,
                'status' => 'PRESENT',
            ];

            $present[] = $userInfo;

            // Check if currently checked in
            if ($pointage->heure_entree && ! $pointage->heure_sortie) {
                $currentlyIn[] = $userInfo;
            }

            // Check if late
            if ($pointage->heure_entree && Carbon::parse($pointage->heure_entree)->gt($msgStartTime)) {
                $userInfo['status'] = 'LATE';
                $late[] = $userInfo;
            }
        }

        foreach ($allUsers as $user) {
            if (! in_array($user->id, $presentIds)) {
                $absent[] = [
                    'id' => $user->id,
                    'nom' => $user->nom,
                    'prenom' => $user->prenom,
                    'email' => $user->email,
                    'matricule' => $user->matricule,
                    'poste' => $user->poste,
                    'status' => 'ABSENT',
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
                'currently_in' => $currentlyIn,
            ],
        ];
    }

    /**
     * Detect employees and team leaders with recurring absences or late check-ins.
     */
    public function getAnomalies(Carbon $endDate, int $days = 30): array
    {
        $days = max(min($days, 90), 7);
        $startDate = $endDate->copy()->subDays($days - 1)->startOfDay();
        $workingDays = $this->countWorkingDays($startDate, $endDate);

        $rows = $this->pointageRepository->getAnomalyAggregates(
            $startDate,
            $endDate,
            self::LATE_THRESHOLD
        );

        $anomalies = [];

        foreach ($rows as $row) {
            $flags = [];
            $absenceCount = (int) $row->absence_count;
            $unjustifiedCount = (int) $row->unjustified_absence_count;
            $lateCount = (int) $row->late_count;
            $presentCount = (int) $row->present_count;

            if ($lateCount >= self::MIN_LATE_COUNT) {
                $flags[] = 'frequent_late';
            }

            $lowAttendance = $workingDays >= 5
                && $presentCount > 0
                && ($presentCount / $workingDays) < self::LOW_ATTENDANCE_RATIO;

            if ($unjustifiedCount >= self::MIN_UNJUSTIFIED_ABSENCE_COUNT
                || $absenceCount >= self::MIN_ABSENCE_COUNT
                || $lowAttendance) {
                $flags[] = 'heavy_absence';
            }

            if ($flags === []) {
                continue;
            }

            $severity = ($lateCount >= 5 || $absenceCount >= 5 || count($flags) > 1) ? 'high' : 'medium';

            $anomalies[] = [
                'id' => (int) $row->id,
                'nom' => $row->nom,
                'prenom' => $row->prenom,
                'matricule' => $row->matricule,
                'role' => $row->role,
                'role_label' => $row->role === 'CHEF_EQUIPE' ? 'Chef d\'équipe' : 'Employé',
                'absence_count' => $absenceCount,
                'unjustified_absence_count' => $unjustifiedCount,
                'late_count' => $lateCount,
                'present_count' => $presentCount,
                'flags' => $flags,
                'severity' => $severity,
            ];
        }

        usort($anomalies, function (array $a, array $b) {
            $severityOrder = ['high' => 0, 'medium' => 1];
            $severityDiff = ($severityOrder[$a['severity']] ?? 2) <=> ($severityOrder[$b['severity']] ?? 2);
            if ($severityDiff !== 0) {
                return $severityDiff;
            }

            return ($b['absence_count'] + $b['late_count']) <=> ($a['absence_count'] + $a['late_count']);
        });

        return [
            'period' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'working_days' => $workingDays,
                'days' => $days,
            ],
            'thresholds' => [
                'late_checkins' => self::MIN_LATE_COUNT,
                'absences' => self::MIN_ABSENCE_COUNT,
                'unjustified_absences' => self::MIN_UNJUSTIFIED_ABSENCE_COUNT,
            ],
            'total' => count($anomalies),
            'anomalies' => $anomalies,
        ];
    }

    private function countWorkingDays(Carbon $startDate, Carbon $endDate): int
    {
        $count = 0;
        $current = $startDate->copy();

        while ($current->lte($endDate)) {
            if (! $current->isWeekend()) {
                $count++;
            }
            $current->addDay();
        }

        return $count;
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->pointageRepository->getByUtilisateur($utilisateurId);
    }

    public function getByUtilisateurPaginated(int $utilisateurId, int $perPage, int $page): array
    {
        return $this->pointageRepository->getByUtilisateurPaginated($utilisateurId, $perPage, $page);
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
        $existing = $this->pointageRepository->getTodayPointage($utilisateurId);
        if ($existing && $existing->heure_entree) {
            throw ValidationException::withMessages([
                'heure_entree' => ['Vous avez déjà pointé votre entrée aujourd\'hui.'],
            ]);
        }

        $pointage = $this->pointageRepository->pointer($utilisateurId, 'entree');

        // Log the check-in activity
        $user = \App\Models\Utilisateur::find($utilisateurId);
        if ($user) {
            ActivityLogger::log(
                'CHECK_IN',
                "{$user->prenom} {$user->nom} a pointé son entrée à ".Carbon::now()->format('H:i'),
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
                    "{$user->prenom} {$user->nom} checked in at ".Carbon::now()->format('H:i').($isLate ? ' (late)' : ''),
                    [
                        'user_id' => $user->id,
                        'user_name' => "{$user->prenom} {$user->nom}",
                        'time' => Carbon::now()->format('H:i'),
                        'is_late' => $isLate,
                        'action' => 'check_in',
                    ]
                ));
            } catch (\Exception $e) {
                \Log::warning('Broadcast failed for AttendanceNotification: '.$e->getMessage());
            }
        }

        return $pointage;
    }

    public function pointerSortie(int $utilisateurId, bool $isAutoCheckout = false): Pointage
    {
        $existing = $this->pointageRepository->getTodayPointage($utilisateurId);
        if (! $existing || ! $existing->heure_entree) {
            throw ValidationException::withMessages([
                'heure_sortie' => ['Vous devez pointer votre entrée avant de pointer votre sortie.'],
            ]);
        }

        $pointage = $this->pointageRepository->pointer($utilisateurId, 'sortie');

        // Log the check-out activity
        $user = \App\Models\Utilisateur::find($utilisateurId);
        if ($user) {
            $message = $isAutoCheckout
                ? "{$user->prenom} {$user->nom} - checkout automatique à ".Carbon::now()->format('H:i')
                : "{$user->prenom} {$user->nom} a pointé sa sortie à ".Carbon::now()->format('H:i');

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
                    "{$user->prenom} {$user->nom} checked out at ".Carbon::now()->format('H:i'),
                    [
                        'user_id' => $user->id,
                        'user_name' => "{$user->prenom} {$user->nom}",
                        'time' => Carbon::now()->format('H:i'),
                        'is_auto' => $isAutoCheckout,
                        'action' => 'check_out',
                    ]
                ));
            } catch (\Exception $e) {
                \Log::warning('Broadcast failed for AttendanceNotification: '.$e->getMessage());
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
