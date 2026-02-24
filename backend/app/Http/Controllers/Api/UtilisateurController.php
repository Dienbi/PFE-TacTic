<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UtilisateurRequest;
use App\Services\UtilisateurService;
use App\Enums\Role;
use App\Enums\EmployeStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class UtilisateurController extends Controller
{
    public function __construct(
        protected UtilisateurService $utilisateurService
    ) {}

    /**
     * Get all users
     */
    public function index(Request $request): JsonResponse
    {
        if ($request->has('paginate')) {
            $users = $this->utilisateurService->getPaginated($request->get('per_page', 15));
        } else {
            $users = Cache::remember('users_all', 120, fn() => $this->utilisateurService->getAll());
        }

        return response()->json($users);
    }

    /**
     * Get user by ID
     */
    public function show(int $id): JsonResponse
    {
        $user = $this->utilisateurService->getById($id);

        if (!$user) {
            return response()->json([
                'message' => 'Utilisateur non trouvé.',
            ], 404);
        }

        return response()->json($user);
    }

    /**
     * Create new user
     */
    public function store(UtilisateurRequest $request): JsonResponse
    {
        $user = $this->utilisateurService->create($request->validated());

        Cache::forget('users_all');
        return response()->json($user, 201);
    }

    /**
     * Update user
     */
    public function update(UtilisateurRequest $request, int $id): JsonResponse
    {
        $success = $this->utilisateurService->update($id, $request->validated());

        if (!$success) {
            return response()->json([
                'message' => 'Erreur lors de la mise à jour.',
            ], 400);
        }

        Cache::forget('users_all');
        return response()->json([
            'message' => 'Utilisateur mis à jour avec succès.',
        ]);
    }

    /**
     * Soft delete user (deactivate)
     */
    public function destroy(int $id): JsonResponse
    {
        $this->utilisateurService->archive($id);

        Cache::forget('users_all');
        return response()->json([
            'message' => 'Utilisateur archivé avec succès.',
        ]);
    }

    /**
     * Get archived users
     */
    public function archived(): JsonResponse
    {
        $users = $this->utilisateurService->getArchived();
        return response()->json($users);
    }

    /**
     * Restore an archived user
     */
    public function restore(int $id): JsonResponse
    {
        $success = $this->utilisateurService->restore($id);

        if (!$success) {
            return response()->json([
                'message' => 'Utilisateur non trouvé ou non archivé.',
            ], 404);
        }

        Cache::forget('users_all');
        return response()->json([
            'message' => 'Utilisateur restauré avec succès.',
        ]);
    }

    /**
     * Permanently delete a user
     */
    public function forceDelete(int $id): JsonResponse
    {
        $success = $this->utilisateurService->forceDelete($id);

        if (!$success) {
            return response()->json([
                'message' => 'Utilisateur non trouvé.',
            ], 404);
        }

        return response()->json([
            'message' => 'Utilisateur supprimé définitivement.',
        ]);
    }

    /**
     * Activate user
     */
    public function activate(int $id): JsonResponse
    {
        $this->utilisateurService->activate($id);

        return response()->json([
            'message' => 'Utilisateur activé avec succès.',
        ]);
    }

    /**
     * Get users by role
     */
    public function byRole(string $role): JsonResponse
    {
        $roleEnum = Role::from(strtoupper($role));
        $users = $this->utilisateurService->getByRole($roleEnum);

        return response()->json($users);
    }

    /**
     * Get available users
     */
    public function disponibles(): JsonResponse
    {
        $users = $this->utilisateurService->getDisponibles();

        return response()->json($users);
    }

    /**
     * Search users
     */
    public function search(Request $request): JsonResponse
    {
        $users = $this->utilisateurService->search($request->get('q', ''));

        return response()->json($users);
    }

    /**
     * Update user status
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $status = EmployeStatus::from($request->status);
        $this->utilisateurService->updateStatus($id, $status);

        return response()->json([
            'message' => 'Statut mis à jour avec succès.',
        ]);
    }

    /**
     * Assign user to team
     */
    public function assignToEquipe(Request $request, int $id): JsonResponse
    {
        $this->utilisateurService->assignToEquipe($id, $request->equipe_id);

        // Log the activity
        \App\Services\ActivityLogger::log('ASSIGN_TEAM', "Assigned user #{$id} to team #{$request->equipe_id}");

        return response()->json([
            'message' => 'Utilisateur assigné à l\'équipe.',
        ]);
    }

    /**
     * Update user competences
     */
    public function updateCompetences(Request $request, int $id): JsonResponse
    {
        $this->utilisateurService->updateCompetences($id, $request->competences);

        return response()->json([
            'message' => 'Compétences mises à jour.',
        ]);
    }
}
