<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Poste;
use App\Repositories\PosteRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosteController extends Controller
{
    public function __construct(
        protected PosteRepository $posteRepository
    ) {}

    /**
     * Get all positions
     */
    public function index(): JsonResponse
    {
        $postes = $this->posteRepository->getAllWithAffectations();

        return response()->json($postes);
    }

    /**
     * Get position by ID
     */
    public function show(int $id): JsonResponse
    {
        $poste = $this->posteRepository->getWithAffectations($id);

        if (!$poste) {
            return response()->json([
                'message' => 'Poste non trouvé.',
            ], 404);
        }

        return response()->json($poste);
    }

    /**
     * Get active positions
     */
    public function actifs(): JsonResponse
    {
        $postes = $this->posteRepository->getActifs();

        return response()->json($postes);
    }

    /**
     * Search positions
     */
    public function search(Request $request): JsonResponse
    {
        $postes = $this->posteRepository->searchByTitre($request->get('q', ''));

        return response()->json($postes);
    }

    /**
     * Create position
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'titre' => 'required|string|max:255',
            'statut' => 'required|string',
            'description' => 'nullable|string',
        ]);

        $poste = $this->posteRepository->create($request->all());

        return response()->json($poste, 201);
    }

    /**
     * Update position
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'titre' => 'sometimes|required|string|max:255',
            'statut' => 'sometimes|required|string',
            'description' => 'nullable|string',
        ]);

        $this->posteRepository->update($id, $request->all());

        return response()->json([
            'message' => 'Poste mis à jour.',
        ]);
    }

    /**
     * Delete position
     */
    public function destroy(int $id): JsonResponse
    {
        $this->posteRepository->delete($id);

        return response()->json([
            'message' => 'Poste supprimé.',
        ]);
    }
}
