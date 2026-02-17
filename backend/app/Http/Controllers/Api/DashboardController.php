<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private DashboardService $dashboardService
    ) {}

    /**
     * Get RH dashboard statistics
     */
    public function rhStats(Request $request): JsonResponse
    {
        $stats = $this->dashboardService->getRhDashboardStats();
        return response()->json($stats);
    }

    /**
     * Get attendance trend data (last 6 months)
     */
    public function attendanceTrend(Request $request): JsonResponse
    {
        $months = $request->input('months', 6);
        $trend = $this->dashboardService->getAttendanceTrend($months);
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

        $distribution = $this->dashboardService->getAbsenceDistribution($startDate, $endDate);
        return response()->json($distribution);
    }
}
