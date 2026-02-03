<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EquipeRequest;
use App\Services\EquipeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquipeController extends Controller
{
    public function __construct(
        protected EquipeService $equipeService
    ) {}

    /**
     * Get all teams
     */
    public function index(): JsonResponse
    {
        $equipes = $this->equipeService->getAll();

        return response()->json($equipes);
    }

    /**
     * Get manager's team
     */
    public function myTeam(): JsonResponse
    {
        $equipe = $this->equipeService->getMyTeam(auth()->id());

        // Return null if no team found, but with 200 OK to avoid console errors
        return response()->json($equipe);
    }

    /**
     * Get team by ID
     */
    public function show(int $id): JsonResponse
    {
        $equipe = $this->equipeService->getById($id);

        if (!$equipe) {
            return response()->json([
                'message' => 'Équipe non trouvée.',
            ], 404);
        }

        return response()->json($equipe);
    }

    /**
     * Create team
     */
    public function store(EquipeRequest $request): JsonResponse
    {
        $equipe = $this->equipeService->create($request->validated());

        return response()->json($equipe, 201);
    }

    /**
     * Update team
     */
    public function update(EquipeRequest $request, int $id): JsonResponse
    {
        $this->equipeService->update($id, $request->validated());

        return response()->json([
            'message' => 'Équipe mise à jour.',
        ]);
    }

    /**
     * Delete team
     */
    public function destroy(int $id): JsonResponse
    {
        $this->equipeService->delete($id);

        return response()->json([
            'message' => 'Équipe supprimée.',
        ]);
    }

    /**
     * Assign team leader
     */
    public function assignChef(Request $request, int $id): JsonResponse
    {
        $this->equipeService->assignChef($id, $request->chef_id);

        return response()->json([
            'message' => 'Chef d\'équipe assigné.',
        ]);
    }

    /**
     * Remove team leader
     */
    public function removeChef(int $id): JsonResponse
    {
        $this->equipeService->removeChef($id);

        return response()->json([
            'message' => 'Chef d\'équipe retiré.',
        ]);
    }

    /**
     * Add member to team
     */
    public function addMembre(Request $request, int $id): JsonResponse
    {
        $this->equipeService->addMembre($id, $request->utilisateur_id);

        return response()->json([
            'message' => 'Membre ajouté à l\'équipe.',
        ]);
    }

    /**
     * Remove member from team
     */
    public function removeMembre(int $id, int $utilisateur_id): JsonResponse
    {
        $this->equipeService->removeMembre($utilisateur_id);

        return response()->json([
            'message' => 'Membre retiré de l\'équipe.',
        ]);
    }

    /**
     * Get team members
     */
    public function membres(int $id): JsonResponse
    {
        $membres = $this->equipeService->getMembres($id);

        return response()->json($membres);
    }
}
