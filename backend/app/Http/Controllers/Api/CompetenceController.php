<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\CompetenceRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompetenceController extends Controller
{
    public function __construct(
        protected CompetenceRepository $competenceRepository
    ) {}

    /**
     * Get all competences
     */
    public function index(): JsonResponse
    {
        $competences = $this->competenceRepository->getAllWithUtilisateurs();

        return response()->json($competences);
    }

    /**
     * Get competence by ID
     */
    public function show(int $id): JsonResponse
    {
        $competence = $this->competenceRepository->getWithUtilisateurs($id);

        if (!$competence) {
            return response()->json([
                'message' => 'Compétence non trouvée.',
            ], 404);
        }

        return response()->json($competence);
    }

    /**
     * Search competences
     */
    public function search(Request $request): JsonResponse
    {
        $competences = $this->competenceRepository->searchByNom($request->get('q', ''));

        return response()->json($competences);
    }

    /**
     * Create competence
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nom' => 'required|string|max:255',
            'niveau' => 'nullable|integer|min:1|max:5',
        ]);

        $competence = $this->competenceRepository->create($request->all());

        return response()->json($competence, 201);
    }

    /**
     * Update competence
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'nom' => 'sometimes|required|string|max:255',
            'niveau' => 'nullable|integer|min:1|max:5',
        ]);

        $this->competenceRepository->update($id, $request->all());

        return response()->json([
            'message' => 'Compétence mise à jour.',
        ]);
    }

    /**
     * Delete competence
     */
    public function destroy(int $id): JsonResponse
    {
        $this->competenceRepository->delete($id);

        return response()->json([
            'message' => 'Compétence supprimée.',
        ]);
    }
}
