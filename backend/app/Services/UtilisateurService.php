<?php

namespace App\Services;

use App\Contracts\Repositories\UtilisateurRepositoryInterface;
use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Models\Utilisateur;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;

class UtilisateurService
{
    public function __construct(
        protected UtilisateurRepositoryInterface $utilisateurRepository
    ) {}

    public function getAll(): Collection
    {
        return $this->utilisateurRepository->getAllWithRelations();
    }

    public function getPaginated(int $perPage = 15, int $page = 1): LengthAwarePaginator
    {
        return $this->utilisateurRepository->getActifsPaginated($perPage, $page);
    }

    public function getById(int $id): ?Utilisateur
    {
        return $this->utilisateurRepository->getWithRelations($id);
    }

    public function create(array $data): Utilisateur
    {
        $data['password'] = Hash::make($data['password']);
        $data['matricule'] = $this->utilisateurRepository->generateMatricule();

        $user = $this->utilisateurRepository->create($data);

        ActivityLogger::log('USER_CREATED', "Created user: {$user->prenom} {$user->nom} ({$user->email})");

        return $user;
    }

    public function update(int $id, array $data): bool
    {
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user = $this->utilisateurRepository->findOrFail($id);
        
        // Check if fiscal profile-related fields are changing
        $fiscalFieldsChanged = $this->checkFiscalFieldsChanged($user, $data);
        
        // Check if fiscal fields are being updated directly (HR bypassing change request)
        $directFiscalUpdate = isset($data['marital_status']) || isset($data['children_count']) || 
                             isset($data['disabled_children_count']) || isset($data['student_non_scholarship_children_count']);
        
        // If fiscal fields are changing, create change request instead of updating data
        if ($fiscalFieldsChanged['hasChanges']) {
            $this->autoCreateChangeRequest($user, $fiscalFieldsChanged);
            
            // Remove fiscal fields from data update
            unset($data['marital_status'], $data['children_count'], 
                  $data['disabled_children_count'], $data['student_non_scholarship_children_count']);
        }
        
        $result = $this->utilisateurRepository->update($id, $data);

        if ($result) {
            ActivityLogger::log('USER_UPDATED', "Updated user: {$user->prenom} {$user->nom}");
            
            // If fiscal fields were updated directly (HR bypassing change request), reassign profile
            if ($directFiscalUpdate) {
                $this->reassignFiscalProfile($id);
            }
        }

        return $result;
    }
    
    private function reassignFiscalProfile(int $userId): void
    {
        try {
            $user = $this->utilisateurRepository->findOrFail($userId);
            $assignmentService = app(\App\Services\FiscalProfile\FiscalProfileAssignmentService::class);
            
            $groupAttributes = [
                'gender' => $user->gender,
                'marital_status' => $user->marital_status,
                'children_count' => $user->children_count,
                'disabled_children_count' => $user->disabled_children_count ?? 0,
                'student_non_scholarship_children_count' => $user->student_non_scholarship_children_count ?? 0,
            ];
            
            $assignmentService->assignProfile(
                (string) $userId,
                $groupAttributes,
                date('Y-m-d'),
                1 // System user ID
            );
            
            ActivityLogger::log('FISCAL_PROFILE_REASSIGNED', "Auto-reassigned fiscal profile for user: {$user->prenom} {$user->nom}");
        } catch (\Exception $e) {
            // Log but don't fail the update
            ActivityLogger::log('FISCAL_REASSIGNMENT_FAILED', "Failed to reassign fiscal profile: {$e->getMessage()}");
        }
    }
    
    private function checkFiscalFieldsChanged(Utilisateur $user, array $data): array
    {
        $changes = [];
        $hasChanges = false;
        
        if (isset($data['marital_status']) && $data['marital_status'] !== $user->marital_status) {
            $changes['requested_marital_status'] = $data['marital_status'];
            $hasChanges = true;
        }
        
        if (isset($data['children_count']) && $data['children_count'] !== $user->children_count) {
            $changes['requested_children_count'] = $data['children_count'];
            $hasChanges = true;
        }
        
        if (isset($data['disabled_children_count']) && $data['disabled_children_count'] !== ($user->disabled_children_count ?? 0)) {
            $changes['requested_disabled_children_count'] = $data['disabled_children_count'];
            $hasChanges = true;
        }
        
        if (isset($data['student_non_scholarship_children_count']) && $data['student_non_scholarship_children_count'] !== ($user->student_non_scholarship_children_count ?? 0)) {
            $changes['requested_student_children_count'] = $data['student_non_scholarship_children_count'];
            $hasChanges = true;
        }
        
        return ['hasChanges' => $hasChanges, 'changes' => $changes];
    }
    
    private function autoCreateChangeRequest(Utilisateur $user, array $fiscalFields): void
    {
        try {
            $service = app(\App\Services\FiscalProfile\PersonalInfoChangeRequestService::class);
            
            $requestData = array_merge($fiscalFields['changes'], [
                'claimed_effective_date' => date('Y-m-d'),
            ]);
            
            $service->submitRequest($user->id, $requestData);
            
            ActivityLogger::log('FISCAL_CHANGE_REQUEST_CREATED', "Auto-created change request for user: {$user->prenom} {$user->nom}");
        } catch (\Exception $e) {
            // Log but don't fail the update
            ActivityLogger::log('FISCAL_CHANGE_REQUEST_FAILED', "Failed to auto-create change request: {$e->getMessage()}");
        }
    }

    public function delete(int $id): bool
    {
        return $this->utilisateurRepository->deactivate($id);
    }

    public function hardDelete(int $id): bool
    {
        return $this->utilisateurRepository->delete($id);
    }

    public function activate(int $id): bool
    {
        return $this->utilisateurRepository->activate($id);
    }

    public function getByRole(Role $role): Collection
    {
        return $this->utilisateurRepository->getByRole($role);
    }

    public function getByEquipe(int $equipeId): Collection
    {
        return $this->utilisateurRepository->getByEquipe($equipeId);
    }

    public function getDisponibles(): Collection
    {
        return $this->utilisateurRepository->getDisponibles();
    }

    public function updateStatus(int $id, EmployeStatus $status): bool
    {
        return $this->utilisateurRepository->updateStatus($id, $status);
    }

    public function search(string $search): Collection
    {
        return $this->utilisateurRepository->searchByName($search);
    }

    public function assignToEquipe(int $utilisateurId, int $equipeId): bool
    {
        $user = $this->utilisateurRepository->findOrFail($utilisateurId);
        $result = $this->utilisateurRepository->update($utilisateurId, ['equipe_id' => $equipeId]);

        if ($result) {
            ActivityLogger::log('TEAM_ASSIGNED', "Assigned {$user->prenom} {$user->nom} to team #{$equipeId}");
        }

        return $result;
    }

    public function removeFromEquipe(int $utilisateurId): bool
    {
        $user = $this->utilisateurRepository->findOrFail($utilisateurId);
        $result = $this->utilisateurRepository->update($utilisateurId, ['equipe_id' => null]);

        if ($result) {
            ActivityLogger::log('TEAM_REMOVED', "Removed {$user->prenom} {$user->nom} from team");
        }

        return $result;
    }

    public function updateCompetences(int $utilisateurId, array $competences): void
    {
        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);
        $utilisateur->competences()->sync($competences);
    }

    public function addCompetence(int $utilisateurId, int $competenceId, int $niveau = 1): void
    {
        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);
        $utilisateur->competences()->attach($competenceId, ['niveau' => $niveau]);
    }

    public function removeCompetence(int $utilisateurId, int $competenceId): void
    {
        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);
        $utilisateur->competences()->detach($competenceId);
    }

    /**
     * Archive (soft delete) a user
     */
    public function archive(int $id): bool
    {
        $user = $this->utilisateurRepository->findOrFail($id);
        $result = $this->utilisateurRepository->archive($id);

        if ($result) {
            ActivityLogger::log('USER_ARCHIVED', "Archived user: {$user->prenom} {$user->nom}");
        }

        return $result;
    }

    /**
     * Restore an archived user
     */
    public function restore(int $id): bool
    {
        $user = $this->utilisateurRepository->getArchivedById($id);
        $result = $this->utilisateurRepository->restore($id);

        if ($result && $user) {
            ActivityLogger::log('USER_RESTORED', "Restored user: {$user->prenom} {$user->nom}");
        }

        return $result;
    }

    /**
     * Permanently delete a user
     */
    public function forceDelete(int $id): bool
    {
        $user = $this->utilisateurRepository->getArchivedById($id);
        $userName = $user ? "{$user->prenom} {$user->nom}" : "User #{$id}";
        $result = $this->utilisateurRepository->forceDelete($id);

        if ($result) {
            ActivityLogger::log('USER_DELETED', "Permanently deleted user: {$userName}");
        }

        return $result;
    }

    /**
     * Get all archived users
     */
    public function getArchived(): Collection
    {
        return $this->utilisateurRepository->getArchived();
    }

    /**
     * Get archived user by ID
     */
    public function getArchivedById(int $id): ?Utilisateur
    {
        return $this->utilisateurRepository->getArchivedById($id);
    }
}
