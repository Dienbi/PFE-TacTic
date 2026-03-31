<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function __construct(
        private DashboardService $dashboardService,
        private \App\Services\AIService $aiService
    ) {
    }

    /**
     * Get all RH dashboard data in one request (stats + trend + absence distribution + AI data)
     */
    public function rhDashboardAll(Request $request): JsonResponse
    {
        $months = (int) $request->input('months', 6);
        $attendanceLimit = (int) $request->input('attendance_limit', 10);
        $performanceLimit = (int) $request->input('performance_limit', 10);
        $recentLeavesLimit = (int) $request->input('recent_leaves_limit', 5);
        $noCache = $request->boolean('noCache');

        if ($noCache) {
            Cache::forget("dashboard_all_{$months}_att{$attendanceLimit}_perf{$performanceLimit}_leaves{$recentLeavesLimit}");
        }

        $cacheKey = "dashboard_all_{$months}_att{$attendanceLimit}_perf{$performanceLimit}_leaves{$recentLeavesLimit}";

        $data = Cache::remember($cacheKey, 300, function () use ($months, $attendanceLimit, $performanceLimit, $recentLeavesLimit) {
            $startDate = Carbon::now()->startOfMonth();
            $endDate   = Carbon::now()->endOfMonth();
            $distKey   = 'absence_dist_' . $startDate->format('Y-m-d') . '_' . $endDate->format('Y-m-d');

            $aiData = Cache::remember(
                "ai_dashboard_{$attendanceLimit}_{$performanceLimit}",
                600,
                fn () => $this->aiService->getDashboardAIData($attendanceLimit, $performanceLimit)
            );

            return [
                'stats'   => Cache::remember(
                    'dashboard_rh_stats',
                    300,
                    fn () => $this->dashboardService->getRhDashboardStats()
                ),
                'trend'   => Cache::remember(
                    "dashboard_trend_{$months}",
                    300,
                    fn () => $this->dashboardService->getAttendanceTrend($months)
                ),
                'absence' => Cache::remember(
                    $distKey,
                    300,
                    fn () => $this->dashboardService->getAbsenceDistribution($startDate, $endDate)
                ),
                'recent_leaves' => Cache::remember(
                    "conges_en_attente_{$recentLeavesLimit}",
                    300,
                    fn () => $this->dashboardService->getRecentLeaves($recentLeavesLimit)
                ),
                'pending_requests' => Cache::remember(
                    'account_requests_pending',
                    300,
                    fn () => $this->dashboardService->getPendingAccountRequests()
                ),
                'recent_logs' => Cache::remember(
                    'recent_activity_logs',
                    300,
                    fn () => $this->dashboardService->getRecentActivityLogs()
                ),

                // AI Data integrated into the single call (parallelized in AIService)
                'ai_attendance' => $aiData['ai_attendance'] ?? [],
                'ai_performance' => $aiData['ai_performance'] ?? [],
                'ai_kpis' => $aiData['ai_kpis'] ?? [],
            ];
        });

        return response()->json($data);
    }

    /**
     * Get RH dashboard statistics
     */
    public function rhStats(Request $request): JsonResponse
    {
        $stats = Cache::remember(
            'dashboard_rh_stats',
            300,
            fn () =>
            $this->dashboardService->getRhDashboardStats()
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
            "dashboard_trend_{$months}",
            300,
            fn () =>
            $this->dashboardService->getAttendanceTrend($months)
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

        $key = 'absence_dist_' . $startDate->format('Y-m-d') . '_' . $endDate->format('Y-m-d');
        $distribution = Cache::remember(
            $key,
            300,
            fn () =>
            $this->dashboardService->getAbsenceDistribution($startDate, $endDate)
        );
        return response()->json($distribution);
    }
}
