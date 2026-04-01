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

        // Pre-warm individual components using CacheService constants
        $this->info('Caching RH stats...');
        \Illuminate\Support\Facades\Cache::put(\App\Services\CacheService::KEY_DASHBOARD_STATS, $dashboardService->getRhDashboardStats(), 3600);

        $this->info('Caching attendance trend...');
        \Illuminate\Support\Facades\Cache::put(\App\Services\CacheService::KEY_DASHBOARD_TREND . "_{$months}", $dashboardService->getAttendanceTrend($months), 3600);

        $this->info('Caching absence distribution...');
        $distCacheKey = \App\Services\CacheService::KEY_ABSENCE_DIST . '_' . $startDate->format('Y-m-d') . '_' . $endDate->format('Y-m-d');
        \Illuminate\Support\Facades\Cache::put($distCacheKey, $dashboardService->getAbsenceDistribution($startDate, $endDate), 3600);

        $this->info('Caching recent leaves...');
        \Illuminate\Support\Facades\Cache::put(\App\Services\CacheService::KEY_RECENT_LEAVES . "_5", $dashboardService->getRecentLeaves(5), 3600);

        $this->info('Caching pending requests...');
        \Illuminate\Support\Facades\Cache::put(\App\Services\CacheService::KEY_PENDING_REQUESTS, $dashboardService->getPendingAccountRequests(), 3600);

        $this->info('Caching recent logs...');
        \Illuminate\Support\Facades\Cache::put(\App\Services\CacheService::KEY_RECENT_LOGS, $dashboardService->getRecentActivityLogs(), 3600);

        // Pre-warm AI Data
        $this->info('Caching AI Dashboard Data...');
        $aiData = $aiService->getDashboardAIData(10, 10);
        // getDashboardAIData already handles its own caching, but we ensure it's fresh

        // Pre-warm the unified all-in-one response
        $this->info('Caching unified dashboard response...');
        $unifiedData = [
            'stats'   => \Illuminate\Support\Facades\Cache::get(\App\Services\CacheService::KEY_DASHBOARD_STATS),
            'trend'   => \Illuminate\Support\Facades\Cache::get(\App\Services\CacheService::KEY_DASHBOARD_TREND . "_{$months}"),
            'absence' => \Illuminate\Support\Facades\Cache::get($distCacheKey),
            'recent_leaves' => \Illuminate\Support\Facades\Cache::get(\App\Services\CacheService::KEY_RECENT_LEAVES . "_5"),
            'pending_requests' => \Illuminate\Support\Facades\Cache::get(\App\Services\CacheService::KEY_PENDING_REQUESTS),
            'recent_logs' => \Illuminate\Support\Facades\Cache::get(\App\Services\CacheService::KEY_RECENT_LOGS),
            'ai_attendance' => $aiData['ai_attendance'] ?? [],
            'ai_performance' => $aiData['ai_performance'] ?? [],
            'ai_kpis' => $aiData['ai_kpis'] ?? [],
        ];

        $unifiedKey = \App\Services\CacheService::getDashboardAllKey($months, 10, 10, 5, true);
        \Illuminate\Support\Facades\Cache::put($unifiedKey, $unifiedData, 3600);

        $this->info('Dashboard cache pre-warming complete!');
    }
}
