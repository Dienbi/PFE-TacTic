<?php

namespace App\Listeners;

use Illuminate\Support\Facades\Cache;

class InvalidateDashboardCache
{
    /**
     * Handle the event.
     */
    public function handle(object $event): void
    {
        // Clear specific component caches
        Cache::forget(\App\Services\CacheService::KEY_RECENT_LOGS);
        Cache::forget(\App\Services\CacheService::KEY_DASHBOARD_STATS);
        Cache::forget(\App\Services\CacheService::KEY_PENDING_REQUESTS);

        // Clear unified dashboard caches (common variants)
        // We clear with and without AI because stats/logs change for both
        Cache::forget(\App\Services\CacheService::getDashboardAllKey(6, 10, 10, 5, true));
        Cache::forget(\App\Services\CacheService::getDashboardAllKey(6, 10, 10, 5, false));
    }
}
