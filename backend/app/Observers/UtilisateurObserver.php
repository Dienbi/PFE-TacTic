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
        // Only invalidate if more than just the last connection date changed
        // This prevents excessive cache wipes on every login
        $changes = $utilisateur->getChanges();
        $onlyLastConnection = count($changes) === 1 && isset($changes['date_derniere_connexion']);

        if (!$onlyLastConnection) {
            // Invalidate active users list
            $this->cacheService->invalidateActiveUsers();
        }

        // Invalidate user-specific caches
        $this->cacheService->invalidateUser($utilisateur->id);

        // If user's team changed, invalidate team caches
        if ($utilisateur->wasChanged('equipe_id')) {
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
