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
        private DashboardService $dashboardService
    ) {}

    /**
     * Get all RH dashboard data in one request (stats + trend + absence distribution)
     */
    public function rhDashboardAll(Request $request): JsonResponse
    {
        $months = (int) $request->input('months', 6);

        // We use a shorter TTL for the consolidated dashboard to keep it fresh
        return response()->json(
            Cache::remember("dashboard_all_full_{$months}", 60, function () use ($months) {
                $startDate = Carbon::now()->startOfMonth();
                $endDate   = Carbon::now()->endOfMonth();

                return [
                    'stats'   => $this->dashboardService->getRhDashboardStats(),
                    'trend'   => $this->dashboardService->getAttendanceTrend($months),
                    'absence' => $this->dashboardService->getAbsenceDistribution($startDate, $endDate),
                    'logs'    => $this->dashboardService->getRecentLogs(10),
                    'account_requests' => $this->dashboardService->getPendingAccountRequests(),
                    'recent_leaves' => $this->dashboardService->getRecentLeaves(5),
                ];
            })
        );
    }

    /**
     * Get RH dashboard statistics
     */
    public function rhStats(Request $request): JsonResponse
    {
        $stats = Cache::remember('dashboard_rh_stats', 300, fn () =>
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
        $trend = Cache::remember("dashboard_trend_{$months}", 300, fn () =>
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
        $distribution = Cache::remember($key, 300, fn () =>
            $this->dashboardService->getAbsenceDistribution($startDate, $endDate)
        );
        return response()->json($distribution);
    }
}
