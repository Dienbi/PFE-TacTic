<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CacheService;
use App\Services\DashboardService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    public function __construct(
        private DashboardService $dashboardService
    ) {}

    private function shouldLogPerf(): bool
    {
        return filter_var(env('PERF_LOG_ENABLED', false), FILTER_VALIDATE_BOOL);
    }

    /**
     * Get all RH dashboard data in one request (stats + trend + absence distribution).
     */
    public function rhDashboardAll(Request $request): JsonResponse
    {
        $totalStart = microtime(true);
        $months = (int) $request->input('months', 6);
        $attendanceLimit = (int) $request->input('attendance_limit', 10);
        $performanceLimit = (int) $request->input('performance_limit', 10);
        $recentLeavesLimit = (int) $request->input('recent_leaves_limit', 5);
        $noCache = $request->boolean('noCache');

        $cacheKey = CacheService::getDashboardAllKey($months, $attendanceLimit, $performanceLimit, $recentLeavesLimit);

        if ($noCache) {
            Cache::forget($cacheKey);
        }

        $fetch = function (string $label, string $key, int $ttl, callable $callback) {
            $hit = Cache::has($key);
            $segmentStart = microtime(true);

            $result = Cache::remember($key, $ttl, function () use ($callback) {
                return $callback();
            });

            if ($this->shouldLogPerf()) {
                Log::info('dashboard.segment', [
                    'label' => $label,
                    'hit' => $hit,
                    'total_ms' => round((microtime(true) - $segmentStart) * 1000, 2),
                ]);
            }

            return $result;
        };

        $data = Cache::remember($cacheKey, 300, function () use ($months, $recentLeavesLimit, $fetch) {
            $startDate = Carbon::now()->startOfMonth();
            $endDate = Carbon::now()->endOfMonth();

            return [
                'stats' => $fetch(
                    'dashboard_rh_stats',
                    CacheService::KEY_DASHBOARD_STATS,
                    300,
                    fn () => $this->dashboardService->getRhDashboardStats()
                ),
                'trend' => $fetch(
                    'dashboard_trend',
                    CacheService::KEY_DASHBOARD_TREND."_{$months}",
                    300,
                    fn () => $this->dashboardService->getAttendanceTrend($months)
                ),
                'absence' => $fetch(
                    'absence_distribution',
                    CacheService::KEY_ABSENCE_DIST.'_'.$startDate->format('Y-m-d').'_'.$endDate->format('Y-m-d'),
                    300,
                    fn () => $this->dashboardService->getAbsenceDistribution($startDate, $endDate)
                ),
                'recent_leaves' => $fetch(
                    'recent_leaves',
                    CacheService::KEY_RECENT_LEAVES."_{$recentLeavesLimit}",
                    300,
                    fn () => $this->dashboardService->getRecentLeaves($recentLeavesLimit)
                ),
                'pending_requests' => $fetch(
                    'pending_account_requests',
                    CacheService::KEY_PENDING_REQUESTS,
                    300,
                    fn () => $this->dashboardService->getPendingAccountRequests()
                ),
                'recent_logs' => $fetch(
                    'recent_activity_logs',
                    CacheService::KEY_RECENT_LOGS,
                    300,
                    fn () => $this->dashboardService->getRecentActivityLogs()
                ),
            ];
        });

        if ($this->shouldLogPerf()) {
            Log::info('dashboard.all.complete', [
                'path' => 'api/dashboard/all',
                'months' => $months,
                'recent_leaves_limit' => $recentLeavesLimit,
                'total_ms' => round((microtime(true) - $totalStart) * 1000, 2),
            ]);
        }

        return response()->json($data);
    }

    /**
     * Get RH dashboard statistics
     */
    public function rhStats(Request $request): JsonResponse
    {
        $stats = Cache::remember(
            CacheService::KEY_DASHBOARD_STATS,
            300,
            fn () => $this->dashboardService->getRhDashboardStats()
        );

        return response()->json($stats);
    }

    /**
     * Get attendance trend data (last 6 months)
     */
    public function attendanceTrend(Request $request): JsonResponse
    {
        $months = $request->input('months', 6);
        $trend = Cache::remember(
            CacheService::KEY_DASHBOARD_TREND."_{$months}",
            300,
            fn () => $this->dashboardService->getAttendanceTrend($months)
        );

        return response()->json($trend);
    }

    /**
     * Get absence distribution
     */
    public function absenceDistribution(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date')
            ? Carbon::parse($request->input('start_date'))
            : Carbon::now()->startOfMonth();

        $endDate = $request->input('end_date')
            ? Carbon::parse($request->input('end_date'))
            : Carbon::now()->endOfMonth();

        $key = CacheService::KEY_ABSENCE_DIST.'_'.$startDate->format('Y-m-d').'_'.$endDate->format('Y-m-d');
        $distribution = Cache::remember(
            $key,
            300,
            fn () => $this->dashboardService->getAbsenceDistribution($startDate, $endDate)
        );

        return response()->json($distribution);
    }

    /**
     * Get manager dashboard data (unified endpoint)
     */
    public function managerDashboard(Request $request): JsonResponse
    {
        $managerId = auth()->id();
        $cacheKey = "dashboard_manager_{$managerId}";
        $noCache = $request->boolean('noCache');

        if ($noCache) {
            Cache::forget($cacheKey);
        }

        $data = Cache::remember($cacheKey, 60, function () use ($managerId) {
            return $this->dashboardService->getManagerDashboard($managerId);
        });

        return response()->json($data);
    }

    /**
     * Get employee dashboard data (unified endpoint)
     */
    public function employeeDashboard(Request $request): JsonResponse
    {
        $employeeId = auth()->id();
        $cacheKey = "dashboard_employee_{$employeeId}";
        $noCache = $request->boolean('noCache');

        if ($noCache) {
            Cache::forget($cacheKey);
        }

        $data = Cache::remember($cacheKey, 30, function () use ($employeeId) {
            return $this->dashboardService->getEmployeeDashboard($employeeId);
        });

        return response()->json($data);
    }
}
