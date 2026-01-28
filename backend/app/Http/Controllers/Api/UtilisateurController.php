<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UtilisateurRequest;
use App\Services\UtilisateurService;
use App\Enums\Role;
use App\Enums\EmployeStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            $users = $this->utilisateurService->getAll();
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

        return response()->json([
            'message' => 'Utilisateur mis à jour avec succès.',
        ]);
    }

    /**
     * Soft delete user (deactivate)
     */
    public function destroy(int $id): JsonResponse
    {
        $this->utilisateurService->delete($id);

        return response()->json([
            'message' => 'Utilisateur désactivé avec succès.',
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
