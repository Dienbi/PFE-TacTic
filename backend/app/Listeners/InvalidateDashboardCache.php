<?php

namespace App\Listeners;

use App\Events\NewActivityLog;
use Illuminate\Support\Facades\Cache;

class InvalidateDashboardCache
{
    /**
     * Handle the event.
     */
    public function handle(object $event): void
    {
        // Clear all dashboard related caches
        Cache::forget("dashboard_all_6_v2");
        Cache::forget("recent_activity_logs");
        Cache::forget("dashboard_rh_stats");
        Cache::forget("conges_en_attente");
        Cache::forget("account_requests_pending");
    }
}
