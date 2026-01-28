<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AffectationRequest;
use App\Services\AffectationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AffectationController extends Controller
{
    public function __construct(
        protected AffectationService $affectationService
    ) {}

    /**
     * Get all assignments
     */
    public function index(): JsonResponse
    {
        $affectations = $this->affectationService->getAll();

        return response()->json($affectations);
    }

    /**
     * Get assignment by ID
     */
    public function show(int $id): JsonResponse
    {
        $affectation = $this->affectationService->getById($id);

        if (!$affectation) {
            return response()->json([
                'message' => 'Affectation non trouvée.',
            ], 404);
        }

        return response()->json($affectation);
    }

    /**
     * Get active assignments
     */
    public function actives(): JsonResponse
    {
        $affectations = $this->affectationService->getActives();

        return response()->json($affectations);
    }

    /**
     * Get assignments by user
     */
    public function byUtilisateur(int $utilisateurId): JsonResponse
    {
        $affectations = $this->affectationService->getByUtilisateur($utilisateurId);

        return response()->json($affectations);
    }

    /**
     * Get assignments by position
     */
    public function byPoste(int $posteId): JsonResponse
    {
        $affectations = $this->affectationService->getByPoste($posteId);

        return response()->json($affectations);
    }

    /**
     * Create assignment
     */
    public function store(AffectationRequest $request): JsonResponse
    {
        $result = $this->affectationService->create($request->validated());

        if (is_array($result) && isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], 400);
        }

        return response()->json($result, 201);
    }

    /**
     * Update assignment
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $this->affectationService->update($id, $request->all());

        return response()->json([
            'message' => 'Affectation mise à jour.',
        ]);
    }

    /**
     * End assignment
     */
    public function terminer(Request $request, int $id): JsonResponse
    {
        $dateFin = $request->has('date_fin') ? Carbon::parse($request->date_fin) : null;
        $this->affectationService->terminer($id, $dateFin);

        return response()->json([
            'message' => 'Affectation terminée.',
        ]);
    }

    /**
     * Delete assignment
     */
    public function destroy(int $id): JsonResponse
    {
        $this->affectationService->delete($id);

        return response()->json([
            'message' => 'Affectation supprimée.',
        ]);
    }
}
