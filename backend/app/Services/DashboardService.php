<?php

namespace App\Services;

use App\Contracts\Repositories\CongeRepositoryInterface;
use App\Contracts\Repositories\PointageRepositoryInterface;
use App\Contracts\Repositories\UtilisateurRepositoryInterface;
use App\Models\AccountRequest;
use App\Models\ActivityLog;
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
        // Both counts in a single query using conditional aggregation
        $startOfMonthDate = Carbon::now()->startOfMonth()->toDateString();
        $userCounts = DB::table('utilisateurs')
            ->whereNull('deleted_at')
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN date_embauche < ? THEN 1 ELSE 0 END) as previous_month
            ', [$startOfMonthDate])
            ->first();

        $totalEmployees = (int) ($userCounts->total ?? 0);
        $previousMonthCount = (int) ($userCounts->previous_month ?? 0);

        $newEmployeesThisMonth = $totalEmployees - $previousMonthCount;
        $employeeChange = $previousMonthCount > 0
            ? round(($newEmployeesThisMonth / $previousMonthCount) * 100, 1)
            : 0;

        // Calculate attendance rate for current month
        $startOfMonth = Carbon::now()->startOfMonth();
        $today = Carbon::now();
        $workingDays = $this->getWorkingDaysBetween($startOfMonth, $today);

        // Only count active employees for attendance rate
        $activeEmployees = $this->utilisateurRepository->countActifs();
        $totalPossibleAttendances = $activeEmployees * $workingDays;

        $prevMonthStart = Carbon::now()->subMonth()->startOfMonth();
        $prevMonthEnd = Carbon::now()->subMonth()->endOfMonth();

        // Bounded date range — avoids full-table scan on pointages
        $pointageStats = DB::table('pointages')
            ->whereNotNull('heure_entree')
            ->whereBetween('date', [$prevMonthStart->toDateString(), $today->toDateString()])
            ->selectRaw('
                COUNT(*) FILTER (WHERE date BETWEEN ? AND ?) as current_month_count,
                COUNT(*) FILTER (WHERE date BETWEEN ? AND ?) as prev_month_count,
                SUM(duree_travail) FILTER (WHERE date BETWEEN ? AND ?) as total_hours
            ', [
                $startOfMonth->toDateString(), $today->toDateString(),
                $prevMonthStart->toDateString(), $prevMonthEnd->toDateString(),
                $startOfMonth->toDateString(), $today->toDateString(),
            ])
            ->first();

        $actualAttendances = (int) ($pointageStats?->current_month_count ?? 0);
        $attendanceRate = $totalPossibleAttendances > 0
            ? round(($actualAttendances / $totalPossibleAttendances) * 100, 1)
            : 100.0;

        // Calculate previous month attendance rate for comparison
        $prevWorkingDays = $this->getWorkingDaysBetween($prevMonthStart, $prevMonthEnd);
        $prevTotalPossible = $previousMonthCount * $prevWorkingDays;
        $prevActualAttendances = (int) ($pointageStats?->prev_month_count ?? 0);
        $prevAttendanceRate = $prevTotalPossible > 0
            ? ($prevActualAttendances / $prevTotalPossible) * 100
            : 0;

        $attendanceChange = $prevAttendanceRate > 0
            ? round($attendanceRate - $prevAttendanceRate, 1)
            : 0;

        // Calculate overtime ratio
        $totalHeuresNormales = $workingDays * 8 * $activeEmployees; // 8 hours per day
        $totalHeuresTravaillees = (float) ($pointageStats?->total_hours ?? 0);

        $heuresSupplementaires = max($totalHeuresTravaillees - $totalHeuresNormales, 0);

        $overtimeRatio = $totalHeuresNormales > 0 && $totalHeuresTravaillees > 0
            ? round(($heuresSupplementaires / $totalHeuresNormales) * 100, 1)
            : 0;

        // Calculate monthly payroll (from paies table)
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();
        $monthlyPayroll = DB::table('paies')
            ->where(function ($query) use ($startOfMonth, $endOfMonth) {
                $query->whereBetween('periode_debut', [$startOfMonth, $endOfMonth])
                    ->orWhereBetween('periode_fin', [$startOfMonth, $endOfMonth])
                    ->orWhere(function ($q) use ($startOfMonth, $endOfMonth) {
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
     * Get attendance trend for the last N months.
     * Optimized: single GROUP BY query instead of N separate queries.
     */
    public function getAttendanceTrend(int $months = 6): array
    {
        $activeEmployees = $this->utilisateurRepository->getActifs()->count();
        $startDate = Carbon::now()->subMonths($months - 1)->startOfMonth();
        $endDate = Carbon::now();

        // Database-agnostic: fetch raw dates and group in PHP
        $attendances = DB::table('pointages')
            ->whereBetween('date', [$startDate, $endDate])
            ->whereNotNull('heure_entree')
            ->select('date')
            ->get();

        // Group by year-month in PHP
        $monthlyCounts = [];
        foreach ($attendances as $attendance) {
            $monthKey = Carbon::parse($attendance->date)->format('Y-m');
            $monthlyCounts[$monthKey] = ($monthlyCounts[$monthKey] ?? 0) + 1;
        }

        $trend = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $monthStart = $date->copy()->startOfMonth();
            $monthEnd = $date->copy()->endOfMonth();

            if ($monthEnd->isFuture()) {
                $monthEnd = Carbon::now();
            }

            $workingDays = $this->getWorkingDaysBetween($monthStart, $monthEnd);
            $totalPossible = $activeEmployees * $workingDays;

            $key = $date->format('Y-m');
            $actual = $monthlyCounts[$key] ?? 0;

            $rate = $totalPossible > 0
                ? round(($actual / $totalPossible) * 100, 1)
                : 0;

            $trend[] = [
                'name' => $date->format('M'),
                'value' => $rate,
                'month' => $key,
            ];
        }

        return $trend;
    }

    /**
     * Get absence distribution by type.
     * Optimized: 2 queries (conges + pointages) instead of 4.
     */
    public function getAbsenceDistribution(Carbon $startDate, Carbon $endDate): array
    {
        // Single query for all conge types using conditional aggregation
        $congeStats = DB::table('conges')
            ->where('statut', 'APPROUVE')
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('date_debut', [$startDate, $endDate])
                    ->orWhereBetween('date_fin', [$startDate, $endDate])
                    ->orWhere(function ($q) use ($startDate, $endDate) {
                        $q->where('date_debut', '<=', $startDate)
                            ->where('date_fin', '>=', $endDate);
                    });
            })
            ->selectRaw("
                COUNT(*) as total_conges,
                SUM(CASE WHEN type = 'MALADIE' THEN 1 ELSE 0 END) as maladie,
                SUM(CASE WHEN type NOT IN ('CONGE', 'MALADIE') THEN 1 ELSE 0 END) as autres
            ")
            ->first();

        $totalConges = $congeStats->total_conges ?? 0;
        $maladie = $congeStats->maladie ?? 0;
        $autres = $congeStats->autres ?? 0;

        // Unjustified absences from pointages
        $absences = DB::table('pointages')
            ->whereBetween('date', [$startDate, $endDate])
            ->whereNull('heure_entree')
            ->where('absence_justifiee', false)
            ->count();

        return [
            [
                'name' => 'Congé',
                'value' => max($totalConges - $maladie, 0),
                'color' => '#3B82F6',
            ],
            [
                'name' => 'Maladie',
                'value' => $maladie,
                'color' => '#10B981',
            ],
            [
                'name' => 'Autre',
                'value' => $autres,
                'color' => '#F59E0B',
            ],
            [
                'name' => 'Absence',
                'value' => $absences,
                'color' => '#EF4444',
            ],
        ];
    }

    /**
     * Get recent leave requests
     */
    public function getRecentLeaves(int $limit = 5)
    {
        return $this->congeRepository->getEnAttenteLimited($limit);
    }

    /**
     * Get pending account requests
     */
    public function getPendingAccountRequests()
    {
        return AccountRequest::pending()
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get recent activity logs
     */
    public function getRecentActivityLogs(int $limit = 20)
    {
        return ActivityLog::with(['user' => fn ($q) => $q->select('id', 'nom', 'prenom', 'role')])
            ->latest()
            ->take($limit)
            ->get();
    }

    /**
     * Calculate working days between two dates (excluding weekends).
     * O(1) math instead of iterating day by day.
     */
    private function getWorkingDaysBetween(Carbon $startDate, Carbon $endDate): int
    {
        if ($endDate->lt($startDate)) {
            return 0;
        }

        $totalDays = $startDate->diffInDays($endDate) + 1;
        $fullWeeks = intdiv($totalDays, 7);
        $remainingDays = $totalDays % 7;

        // Full weeks contribute 5 working days each
        $workingDays = $fullWeeks * 5;

        // Count working days in the remaining partial week
        $dayOfWeek = $startDate->dayOfWeekIso; // 1=Monday ... 7=Sunday
        for ($i = 0; $i < $remainingDays; $i++) {
            $day = (($dayOfWeek - 1 + $i) % 7) + 1;
            if ($day <= 5) { // Monday-Friday
                $workingDays++;
            }
        }

        return $workingDays;
    }

    /**
     * Get manager dashboard data
     */
    public function getManagerDashboard(int $managerId): array
    {
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();

        // Get team info with members
        $team = DB::table('equipes')
            ->where('chef_equipe_id', $managerId)
            ->first();

        if (!$team) {
            return [
                'team' => null,
                'team_size' => 0,
                'available' => 0,
                'on_leave' => 0,
                'alerts' => 0,
                'pending_leaves' => [],
            ];
        }

        // Get team members with their current status
        $members = DB::table('utilisateurs')
            ->where('equipe_id', $team->id)
            ->whereNull('deleted_at')
            ->select('id', 'nom', 'prenom', 'matricule', 'status')
            ->get();

        $teamSize = $members->count();
        $available = 0;
        $onLeave = 0;
        $alerts = 0;

        // Get today's attendance for team members
        $memberIds = $members->pluck('id');
        $todayAttendances = DB::table('pointages')
            ->whereIn('utilisateur_id', $memberIds)
            ->where('date', $today->toDateString())
            ->select('utilisateur_id', 'heure_entree', 'heure_sortie')
            ->get()
            ->keyBy('utilisateur_id');

        // Get approved leaves for today
        $todayLeaves = DB::table('conges')
            ->whereIn('utilisateur_id', $memberIds)
            ->where('statut', 'APPROUVE')
            ->where('date_debut', '<=', $today->toDateString())
            ->where('date_fin', '>=', $today->toDateString())
            ->select('utilisateur_id', 'type')
            ->get()
            ->keyBy('utilisateur_id');

        // Get pending leaves for the team
        $pendingLeaves = DB::table('conges')
            ->whereIn('utilisateur_id', $memberIds)
            ->where('statut', 'EN_ATTENTE')
            ->join('utilisateurs', 'conges.utilisateur_id', '=', 'utilisateurs.id')
            ->select('conges.id', 'conges.type', 'conges.date_debut', 'conges.date_fin', 'utilisateurs.nom', 'utilisateurs.prenom')
            ->orderBy('conges.date_debut', 'desc')
            ->limit(5)
            ->get();

        // Calculate team status
        foreach ($members as $member) {
            $memberId = $member->id;

            if (isset($todayLeaves[$memberId])) {
                $onLeave++;
            } elseif (isset($todayAttendances[$memberId])) {
                $available++;
            } else {
                // Not checked in yet and not on leave - could be alert
                $alerts++;
            }
        }

        return [
            'team' => [
                'id' => $team->id,
                'nom' => $team->nom,
                'chef_id' => $team->chef_equipe_id,
            ],
            'team_size' => $teamSize,
            'available' => $available,
            'on_leave' => $onLeave,
            'alerts' => $alerts,
            'pending_leaves' => $pendingLeaves,
        ];
    }

    /**
     * Get employee dashboard data
     */
    public function getEmployeeDashboard(int $employeeId): array
    {
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();

        // Get today's attendance
        $todayAttendance = DB::table('pointages')
            ->where('utilisateur_id', $employeeId)
            ->where('date', $today->toDateString())
            ->first();

        // Get monthly stats
        $monthlyStats = DB::table('pointages')
            ->where('utilisateur_id', $employeeId)
            ->whereBetween('date', [$startOfMonth->toDateString(), $today->toDateString()])
            ->selectRaw('
                COUNT(*) as total_days,
                SUM(duree_travail) as total_hours
            ')
            ->first();

        // Get recent leaves
        $recentLeaves = DB::table('conges')
            ->where('utilisateur_id', $employeeId)
            ->orderBy('date_debut', 'desc')
            ->limit(5)
            ->select('id', 'type', 'date_debut', 'date_fin', 'statut')
            ->get();

        // Get latest payslip
        $latestPayslip = DB::table('paies')
            ->where('utilisateur_id', $employeeId)
            ->orderBy('periode_debut', 'desc')
            ->select('id', 'periode_debut', 'periode_fin', 'salaire_brut', 'deductions', 'salaire_net')
            ->first();

        return [
            'today_attendance' => $todayAttendance,
            'monthly_stats' => [
                'total_days' => (int) ($monthlyStats->total_days ?? 0),
                'total_hours' => (float) ($monthlyStats->total_hours ?? 0),
            ],
            'recent_leaves' => $recentLeaves,
            'latest_payslip' => $latestPayslip,
        ];
    }
}
