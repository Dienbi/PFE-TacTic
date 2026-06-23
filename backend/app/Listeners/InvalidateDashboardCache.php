<?php

namespace App\Listeners;

use App\Services\CacheService;

class InvalidateDashboardCache
{
    public function __construct(private CacheService $cacheService)
    {
    }

    /**
     * Handle the event.
     */
    public function handle(object $event): void
    {
        $this->cacheService->invalidateDashboard();
    }
}
