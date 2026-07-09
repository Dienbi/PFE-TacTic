<?php

namespace App\Observers;

use App\Models\Conge;
use App\Services\CacheService;
use Illuminate\Support\Facades\Cache;

class CongeObserver
{
    public function __construct(protected CacheService $cacheService) {}

    /**
     * Handle the Conge "created" event.
     */
    public function created(Conge $conge): void
    {
        $this->invalidateCaches($conge);
    }

    /**
     * Handle the Conge "updated" event.
     */
    public function updated(Conge $conge): void
    {
        $this->invalidateCaches($conge);
    }

    /**
     * Handle the Conge "deleted" event.
     */
    public function deleted(Conge $conge): void
    {
        $this->invalidateCaches($conge);
    }

    /**
     * Invalidate relevant caches when leave data changes
     */
    private function invalidateCaches(Conge $conge): void
    {
        // Invalidate employee dashboard cache for the affected user
        Cache::forget("dashboard_employee_{$conge->utilisateur_id}");

        // Invalidate manager dashboard cache for the user's team (if they have one)
        $user = $conge->utilisateur;
        if ($user && $user->equipe_id) {
            $team = $user->equipe;
            if ($team && $team->chef_id) {
                Cache::forget("dashboard_manager_{$team->chef_id}");
            }
        }

        // Invalidate pending leaves cache
        Cache::forget(CacheService::KEY_CONGES_EN_ATTENTE);

        // Invalidate RH dashboard (recent leaves and absence distribution)
        $this->cacheService->invalidateDashboard();
    }
}
