<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class PrewarmDashboardCache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:prewarm-dashboard-cache';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Pre-calculates and caches the RH Dashboard data to ensure instant loading.';

    /**
     * Execute the console command.
     */
    public function handle(\App\Services\DashboardService $dashboardService, \App\Services\AIService $aiService)
    {
        $this->info('Starting dashboard cache pre-warming...');

        $months = 6;
        $startDate = \Carbon\Carbon::now()->startOfMonth();
        $endDate   = \Carbon\Carbon::now()->endOfMonth();
        $distKey   = 'absence_dist_' . $startDate->format('Y-m-d') . '_' . $endDate->format('Y-m-d');

        // Pre-warm individual components
        $this->info('Caching RH stats...');
        \Illuminate\Support\Facades\Cache::put('dashboard_rh_stats', $dashboardService->getRhDashboardStats(), 3600);

        $this->info('Caching attendance trend...');
        \Illuminate\Support\Facades\Cache::put("dashboard_trend_{$months}", $dashboardService->getAttendanceTrend($months), 3600);

        $this->info('Caching absence distribution...');
        \Illuminate\Support\Facades\Cache::put($distKey, $dashboardService->getAbsenceDistribution($startDate, $endDate), 3600);

        $this->info('Caching recent leaves...');
        \Illuminate\Support\Facades\Cache::put('conges_en_attente', $dashboardService->getRecentLeaves(), 3600);

        $this->info('Caching pending requests...');
        \Illuminate\Support\Facades\Cache::put('account_requests_pending', $dashboardService->getPendingAccountRequests(), 3600);

        $this->info('Caching recent logs...');
        \Illuminate\Support\Facades\Cache::put('recent_activity_logs', $dashboardService->getRecentActivityLogs(), 3600);

        // Pre-warm AI Data
        $this->info('Caching AI Attendance predictions...');
        \Illuminate\Support\Facades\Cache::put('ai_attendance_all', $aiService->getAttendancePredictionsAll(), 3600);

        $this->info('Caching AI Performance scores...');
        \Illuminate\Support\Facades\Cache::put('ai_performance_all', $aiService->getPerformanceScoresAll(), 3600);

        $this->info('Caching AI Dashboard KPIs...');
        \Illuminate\Support\Facades\Cache::put('ai_dashboard_kpis', $aiService->getDashboardKPIs(), 3600);

        // Pre-warm the unified all-in-one response
        $this->info('Caching unified dashboard response...');
        $unifiedData = [
            'stats'   => \Illuminate\Support\Facades\Cache::get('dashboard_rh_stats'),
            'trend'   => \Illuminate\Support\Facades\Cache::get("dashboard_trend_{$months}"),
            'absence' => \Illuminate\Support\Facades\Cache::get($distKey),
            'recent_leaves' => \Illuminate\Support\Facades\Cache::get('conges_en_attente'),
            'pending_requests' => \Illuminate\Support\Facades\Cache::get('account_requests_pending'),
            'recent_logs' => \Illuminate\Support\Facades\Cache::get('recent_activity_logs'),
            'ai_attendance' => \Illuminate\Support\Facades\Cache::get('ai_attendance_all'),
            'ai_performance' => \Illuminate\Support\Facades\Cache::get('ai_performance_all'),
        ];
        \Illuminate\Support\Facades\Cache::put("dashboard_all_{$months}_v2", $unifiedData, 3600);

        $this->info('Dashboard cache pre-warming complete!');
    }
}
