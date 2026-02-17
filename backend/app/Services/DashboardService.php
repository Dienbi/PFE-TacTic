<?php

namespace App\Services;

use App\Contracts\Repositories\UtilisateurRepositoryInterface;
use App\Contracts\Repositories\PointageRepositoryInterface;
use App\Contracts\Repositories\CongeRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function __construct(
        private UtilisateurRepositoryInterface $utilisateurRepository,
        private PointageRepositoryInterface $pointageRepository,
        private CongeRepositoryInterface $congeRepository
    ) {}

    /**
     * Get RH dashboard KPI statistics
     */
    public function getRhDashboardStats(): array
    {
        // Count ALL users (not just active)
        $totalEmployees = DB::table('utilisateurs')
            ->whereNull('deleted_at')
            ->count();

        // Get previous month count for comparison
        $previousMonthCount = DB::table('utilisateurs')
            ->whereNull('deleted_at')
            ->where('date_embauche', '<', Carbon::now()->startOfMonth())
            ->count();

        $newEmployeesThisMonth = $totalEmployees - $previousMonthCount;
        $employeeChange = $previousMonthCount > 0
            ? round(($newEmployeesThisMonth / $previousMonthCount) * 100, 1)
            : 0;

        // Calculate attendance rate for current month
        $startOfMonth = Carbon::now()->startOfMonth();
        $today = Carbon::now();
        $workingDays = $this->getWorkingDaysBetween($startOfMonth, $today);

        // Only count active employees for attendance rate
        $activeEmployees = $this->utilisateurRepository->getActifs()->count();
        $totalPossibleAttendances = $activeEmployees * $workingDays;

        $actualAttendances = DB::table('pointages')
            ->whereBetween('date', [$startOfMonth, $today])
            ->whereNotNull('heure_entree')
            ->count();

        $attendanceRate = $totalPossibleAttendances > 0
            ? round(($actualAttendances / $totalPossibleAttendances) * 100, 1)
            : 100.0;

        // Calculate previous month attendance rate for comparison
        $prevMonthStart = Carbon::now()->subMonth()->startOfMonth();
        $prevMonthEnd = Carbon::now()->subMonth()->endOfMonth();
        $prevWorkingDays = $this->getWorkingDaysBetween($prevMonthStart, $prevMonthEnd);
        $prevTotalPossible = $previousMonthCount * $prevWorkingDays;
        $prevActualAttendances = DB::table('pointages')
            ->whereBetween('date', [$prevMonthStart, $prevMonthEnd])
            ->whereNotNull('heure_entree')
            ->count();
        $prevAttendanceRate = $prevTotalPossible > 0
            ? ($prevActualAttendances / $prevTotalPossible) * 100
            : 0;

        $attendanceChange = $prevAttendanceRate > 0
            ? round($attendanceRate - $prevAttendanceRate, 1)
            : 0;

        // Calculate overtime ratio
        $totalHeuresNormales = $workingDays * 8 * $activeEmployees; // 8 hours per day
        $totalHeuresTravaillees = DB::table('pointages')
            ->whereBetween('date', [$startOfMonth, $today])
            ->whereNotNull('heure_entree')
            ->sum('duree_travail') ?? 0;

        $heuresSupplementaires = max($totalHeuresTravaillees - $totalHeuresNormales, 0);

        $overtimeRatio = $totalHeuresNormales > 0 && $totalHeuresTravaillees > 0
            ? round(($heuresSupplementaires / $totalHeuresNormales) * 100, 1)
            : 0;

        // Calculate monthly payroll (from paies table)
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();
        $monthlyPayroll = DB::table('paies')
            ->where(function($query) use ($startOfMonth, $endOfMonth) {
                $query->whereBetween('periode_debut', [$startOfMonth, $endOfMonth])
                    ->orWhereBetween('periode_fin', [$startOfMonth, $endOfMonth])
                    ->orWhere(function($q) use ($startOfMonth, $endOfMonth) {
                        $q->where('periode_debut', '<=', $startOfMonth)
                          ->where('periode_fin', '>=', $endOfMonth);
                    });
            })
            ->sum('salaire_net') ?? 0;

        return [
            'total_employees' => $totalEmployees,
            'employee_change' => $employeeChange,
            'attendance_rate' => $attendanceRate,
            'attendance_change' => $attendanceChange,
            'overtime_ratio' => $overtimeRatio,
            'monthly_payroll' => round($monthlyPayroll, 2),
        ];
    }

    /**
     * Get attendance trend for the last N months
     */
    public function getAttendanceTrend(int $months = 6): array
    {
        $trend = [];
        $totalEmployees = $this->utilisateurRepository->getActifs()->count();

        for ($i = $months - 1; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $startOfMonth = $date->copy()->startOfMonth();
            $endOfMonth = $date->copy()->endOfMonth();

            // Don't calculate beyond current date for current month
            if ($endOfMonth->isFuture()) {
                $endOfMonth = Carbon::now();
            }

            $workingDays = $this->getWorkingDaysBetween($startOfMonth, $endOfMonth);
            $totalPossible = $totalEmployees * $workingDays;

            $actualAttendances = DB::table('pointages')
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->whereNotNull('heure_entree')
                ->count();

            $rate = $totalPossible > 0
                ? round(($actualAttendances / $totalPossible) * 100, 1)
                : 0;

            $trend[] = [
                'name' => $date->format('M'),
                'value' => $rate,
                'month' => $date->format('Y-m'),
            ];
        }

        return $trend;
    }

    /**
     * Get absence distribution by type
     */
    public function getAbsenceDistribution(Carbon $startDate, Carbon $endDate): array
    {
        // Count approved leaves (congés)
        $conges = DB::table('conges')
            ->where('statut', 'APPROUVE')
            ->where(function($query) use ($startDate, $endDate) {
                $query->whereBetween('date_debut', [$startDate, $endDate])
                    ->orWhereBetween('date_fin', [$startDate, $endDate])
                    ->orWhere(function($q) use ($startDate, $endDate) {
                        $q->where('date_debut', '<=', $startDate)
                          ->where('date_fin', '>=', $endDate);
                    });
            })
            ->count();

        // Count sick leaves (congé maladie by type)
        $maladie = DB::table('conges')
            ->where('statut', 'APPROUVE')
            ->where('type', 'MALADIE')
            ->where(function($query) use ($startDate, $endDate) {
                $query->whereBetween('date_debut', [$startDate, $endDate])
                    ->orWhereBetween('date_fin', [$startDate, $endDate]);
            })
            ->count();

        // Count unjustified absences (pointages without entry time)
        $absences = DB::table('pointages')
            ->whereBetween('date', [$startDate, $endDate])
            ->whereNull('heure_entree')
            ->where('absence_justifiee', false)
            ->count();

        // Other leaves (excluding standard vacation and sick leave)
        $autres = DB::table('conges')
            ->where('statut', 'APPROUVE')
            ->whereNotIn('type', ['CONGE', 'MALADIE'])
            ->where(function($query) use ($startDate, $endDate) {
                $query->whereBetween('date_debut', [$startDate, $endDate])
                    ->orWhereBetween('date_fin', [$startDate, $endDate]);
            })
            ->count();

        return [
            [
                'name' => 'Congé',
                'value' => max($conges - $maladie, 0),
                'color' => '#3B82F6'
            ],
            [
                'name' => 'Maladie',
                'value' => $maladie,
                'color' => '#10B981'
            ],
            [
                'name' => 'Autre',
                'value' => $autres,
                'color' => '#F59E0B'
            ],
            [
                'name' => 'Absence',
                'value' => $absences,
                'color' => '#EF4444'
            ],
        ];
    }

    /**
     * Calculate working days between two dates (excluding weekends)
     */
    private function getWorkingDaysBetween(Carbon $startDate, Carbon $endDate): int
    {
        $workingDays = 0;
        $current = $startDate->copy();

        while ($current->lte($endDate)) {
            // Skip weekends (Saturday = 6, Sunday = 0)
            if ($current->dayOfWeek !== Carbon::SATURDAY && $current->dayOfWeek !== Carbon::SUNDAY) {
                $workingDays++;
            }
            $current->addDay();
        }

        return $workingDays;
    }
}
