<?php

namespace App\Console\Commands;

use App\Services\CacheService;
use App\Services\DashboardService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class PrewarmDashboardCache extends Command
{
    protected $signature = 'app:prewarm-dashboard-cache';

    protected $description = 'Pre-calculates and caches the RH Dashboard data to ensure instant loading.';

    public function handle(DashboardService $dashboardService): void
    {
        $this->info('Starting dashboard cache pre-warming...');

        $months = 6;
        $startDate = Carbon::now()->startOfMonth();
        $endDate = Carbon::now()->endOfMonth();
        $distCacheKey = CacheService::KEY_ABSENCE_DIST.'_'.$startDate->format('Y-m-d').'_'.$endDate->format('Y-m-d');

        $this->info('Caching RH stats...');
        Cache::put(CacheService::KEY_DASHBOARD_STATS, $dashboardService->getRhDashboardStats(), 3600);

        $this->info('Caching attendance trend...');
        Cache::put(CacheService::KEY_DASHBOARD_TREND."_{$months}", $dashboardService->getAttendanceTrend($months), 3600);

        $this->info('Caching absence distribution...');
        Cache::put($distCacheKey, $dashboardService->getAbsenceDistribution($startDate, $endDate), 3600);

        $this->info('Caching recent leaves...');
        Cache::put(CacheService::KEY_RECENT_LEAVES.'_5', $dashboardService->getRecentLeaves(5), 3600);

        $this->info('Caching pending requests...');
        Cache::put(CacheService::KEY_PENDING_REQUESTS, $dashboardService->getPendingAccountRequests(), 3600);

        $this->info('Caching recent logs...');
        Cache::put(CacheService::KEY_RECENT_LOGS, $dashboardService->getRecentActivityLogs(), 3600);

        $this->info('Caching unified dashboard response...');
        $unifiedData = [
            'stats' => Cache::get(CacheService::KEY_DASHBOARD_STATS),
            'trend' => Cache::get(CacheService::KEY_DASHBOARD_TREND."_{$months}"),
            'absence' => Cache::get($distCacheKey),
            'recent_leaves' => Cache::get(CacheService::KEY_RECENT_LEAVES.'_5'),
            'pending_requests' => Cache::get(CacheService::KEY_PENDING_REQUESTS),
            'recent_logs' => Cache::get(CacheService::KEY_RECENT_LOGS),
        ];

        $unifiedKey = CacheService::getDashboardAllKey($months, 10, 10, 5);
        Cache::put($unifiedKey, $unifiedData, 3600);

        $this->info('Dashboard cache pre-warming complete!');
    }
}
