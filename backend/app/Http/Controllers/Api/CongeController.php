<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CongeRequest;
use App\Services\CongeService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CongeController extends Controller
{
    public function __construct(
        protected CongeService $congeService
    ) {}

    /**
     * Get all leave requests
     */
    public function index(): JsonResponse
    {
        $conges = $this->congeService->getAll();

        return response()->json($conges);
    }

    /**
     * Get leave request by ID
     */
    public function show(int $id): JsonResponse
    {
        $conge = $this->congeService->getById($id);

        if (!$conge) {
            return response()->json([
                'message' => 'Demande de congé non trouvée.',
            ], 404);
        }

        return response()->json($conge);
    }

    /**
     * Get leave requests for current user
     */
    public function mesConges(Request $request): JsonResponse
    {
        $conges = $this->congeService->getByUtilisateur($request->user()->id);

        return response()->json($conges);
    }

    /**
     * Get pending leave requests
     */
    public function enAttente(): JsonResponse
    {
        $conges = $this->congeService->getEnAttente();

        return response()->json($conges);
    }

    /**
     * Get pending leave requests for team
     */
    public function enAttenteEquipe(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->equipeGeree) {
            return response()->json([
                'message' => 'Vous n\'êtes pas chef d\'équipe.',
            ], 403);
        }

        $conges = $this->congeService->getEnAttenteByEquipe($user->equipeGeree->id);

        return response()->json($conges);
    }

    /**
     * Create leave request
     */
    public function store(CongeRequest $request): JsonResponse
    {
        $result = $this->congeService->demander(
            $request->user()->id,
            $request->validated()
        );

        if (is_array($result) && isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], 400);
        }

        return response()->json($result, 201);
    }

    /**
     * Approve leave request
     */
    public function approuver(Request $request, int $id): JsonResponse
    {
        $success = $this->congeService->approuver($id, $request->user()->id);

        if (!$success) {
            return response()->json([
                'message' => 'Erreur lors de l\'approbation.',
            ], 400);
        }

        return response()->json([
            'message' => 'Congé approuvé avec succès.',
        ]);
    }

    /**
     * Reject leave request
     */
    public function refuser(Request $request, int $id): JsonResponse
    {
        $success = $this->congeService->refuser($id, $request->user()->id);

        if (!$success) {
            return response()->json([
                'message' => 'Erreur lors du refus.',
            ], 400);
        }

        return response()->json([
            'message' => 'Congé refusé.',
        ]);
    }

    /**
     * Cancel leave request
     */
    public function annuler(int $id): JsonResponse
    {
        $success = $this->congeService->annuler($id);

        if (!$success) {
            return response()->json([
                'message' => 'Impossible d\'annuler cette demande.',
            ], 400);
        }

        return response()->json([
            'message' => 'Demande annulée.',
        ]);
    }

    /**
     * Get leave requests by period
     */
    public function byPeriod(Request $request): JsonResponse
    {
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);

        $conges = $this->congeService->getByPeriod($startDate, $endDate);

        return response()->json($conges);
    }
}
