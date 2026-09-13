<?php

namespace App\Observers;

use App\Models\Pointage;
use App\Services\CacheService;
use Illuminate\Support\Facades\Cache;

class PointageObserver
{
    public function __construct(protected CacheService $cacheService)
    {
    }

    /**
     * Handle the Pointage "created" event.
     */
    public function created(Pointage $pointage): void
    {
        $this->invalidateCaches($pointage);
    }

    /**
     * Handle the Pointage "updated" event.
     */
    public function updated(Pointage $pointage): void
    {
        $this->invalidateCaches($pointage);
    }

    /**
     * Handle the Pointage "deleted" event.
     */
    public function deleted(Pointage $pointage): void
    {
        $this->invalidateCaches($pointage);
    }

    /**
     * Invalidate relevant caches when attendance data changes
     */
    private function invalidateCaches(Pointage $pointage): void
    {
        // Invalidate employee dashboard cache for the affected user
        Cache::forget("dashboard_employee_{$pointage->utilisateur_id}");

        // Invalidate manager dashboard cache for the user's team (if they have one)
        $user = $pointage->utilisateur;
        if ($user && $user->equipe_id) {
            $team = $user->equipe;
            if ($team && $team->chef_equipe_id) {
                Cache::forget("dashboard_manager_{$team->chef_equipe_id}");
            }
        }

        // Invalidate RH dashboard stats and trend (attendance affects these)
        $this->cacheService->invalidateDashboard();

        // Invalidate attendance summary and anomalies caches for the pointage's date
        $this->cacheService->invalidateAttendanceForDate($pointage->date->toDateString());
    }
}
