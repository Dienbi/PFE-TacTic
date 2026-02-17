<?php

namespace App\Observers;

use App\Models\Paie;
use App\Services\CacheService;

class PaieObserver
{
    public function __construct(protected CacheService $cacheService)
    {
    }

    /**
     * Handle the Paie "created" event.
     */
    public function created(Paie $paie): void
    {
        $this->invalidateCaches($paie);
    }

    /**
     * Handle the Paie "updated" event.
     */
    public function updated(Paie $paie): void
    {
        $this->invalidateCaches($paie);
    }

    /**
     * Handle the Paie "deleted" event.
     */
    public function deleted(Paie $paie): void
    {
        $this->invalidateCaches($paie);
    }

    /**
     * Invalidate payroll statistics cache when paie records change
     */
    private function invalidateCaches(Paie $paie): void
    {
        $this->cacheService->invalidatePayrollStats();
    }
}
