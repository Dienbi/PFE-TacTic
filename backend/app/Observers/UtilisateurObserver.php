<?php

namespace App\Observers;

use App\Models\Utilisateur;
use App\Services\CacheService;

class UtilisateurObserver
{
    public function __construct(protected CacheService $cacheService)
    {
    }

    /**
     * Handle the Utilisateur "created" event.
     */
    public function created(Utilisateur $utilisateur): void
    {
        $this->invalidateCaches($utilisateur);
    }

    /**
     * Handle the Utilisateur "updated" event.
     */
    public function updated(Utilisateur $utilisateur): void
    {
        $this->invalidateCaches($utilisateur);
    }

    /**
     * Handle the Utilisateur "deleted" event.
     */
    public function deleted(Utilisateur $utilisateur): void
    {
        $this->invalidateCaches($utilisateur);
    }

    /**
     * Handle the Utilisateur "restored" event.
     */
    public function restored(Utilisateur $utilisateur): void
    {
        $this->invalidateCaches($utilisateur);
    }

    /**
     * Invalidate relevant caches when user data changes
     */
    private function invalidateCaches(Utilisateur $utilisateur): void
    {
        // Invalidate active users list
        $this->cacheService->invalidateActiveUsers();

        // Invalidate user-specific caches
        $this->cacheService->invalidateUser($utilisateur->id);

        // If user's team changed, invalidate team caches
        if ($utilisateur->isDirty('equipe_id')) {
            if ($utilisateur->getOriginal('equipe_id')) {
                $this->cacheService->invalidateTeamMembers($utilisateur->getOriginal('equipe_id'));
            }
            if ($utilisateur->equipe_id) {
                $this->cacheService->invalidateTeamMembers($utilisateur->equipe_id);
            }
            $this->cacheService->invalidateTeams();
        }
    }
}
