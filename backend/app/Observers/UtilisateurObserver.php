<?php

namespace App\Observers;

use App\Models\Utilisateur;
use App\Services\CacheService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UtilisateurObserver
{
    public function __construct(
        protected CacheService $cacheService
    ) {}

    /**
     * Handle the Utilisateur "created" event.
     */
    public function created(Utilisateur $utilisateur): void
    {
        $this->handleFiscalFields($utilisateur);
        $this->invalidateCaches($utilisateur);
    }

    /**
     * Handle the Utilisateur "updated" event.
     */
    public function updated(Utilisateur $utilisateur): void
    {
        $this->handleFiscalFields($utilisateur);
        $this->invalidateCaches($utilisateur);
    }

    /**
     * Handle fiscal field changes and update head_of_family + history
     */
    private function handleFiscalFields(Utilisateur $utilisateur): void
    {
        $fiscalFields = ['gender', 'marital_status', 'children_count', 'disabled_children_count', 'student_non_scholarship_children_count'];
        $fiscalFieldsChanged = false;

        foreach ($fiscalFields as $field) {
            if ($utilisateur->wasChanged($field)) {
                $fiscalFieldsChanged = true;
                break;
            }
        }

        if ($fiscalFieldsChanged) {
            // Compute new head_of_family inline
            $gender = $utilisateur->gender ?? 'male';
            $maritalStatus = $utilisateur->marital_status ?? 'single';
            $childrenCount = $utilisateur->children_count ?? 0;
            
            // Head of family logic: male married with children, or female married with disabled children
            $newHeadOfFamily = ($gender === 'male' && $maritalStatus === 'married' && $childrenCount > 0) ||
                              ($gender === 'female' && $maritalStatus === 'married' && $utilisateur->disabled_children_count > 0);

            // Update head_of_family attribute (will be saved with the current save operation)
            $utilisateur->head_of_family = $newHeadOfFamily;

            // Close current fiscal status history and create new entry
            $this->updateFiscalStatusHistory($utilisateur);
        }
    }

    /**
     * Update fiscal status history when fiscal fields change
     */
    private function updateFiscalStatusHistory(Utilisateur $utilisateur): void
    {
        // Close current history entry
        DB::table('employee_fiscal_status_history')
            ->where('employee_id', $utilisateur->id)
            ->whereNull('effective_to')
            ->update([
                'effective_to' => now()->subDay()->toDateString(),
                'updated_at' => now(),
            ]);

        // Create new history entry
        DB::table('employee_fiscal_status_history')->insert([
            'id' => (string) Str::uuid(),
            'employee_id' => $utilisateur->id,
            'marital_status' => $utilisateur->marital_status ?? 'single',
            'children_count' => $utilisateur->children_count ?? 0,
            'disabled_children_count' => $utilisateur->disabled_children_count ?? 0,
            'student_non_scholarship_children_count' => $utilisateur->student_non_scholarship_children_count ?? 0,
            'head_of_family' => $utilisateur->head_of_family,
            'effective_from' => now()->toDateString(),
            'effective_to' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
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

        if (! $onlyLastConnection) {
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
