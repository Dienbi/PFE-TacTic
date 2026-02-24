<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CongeRequest;
use App\Services\CongeService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CongeController extends Controller
{
    public function __construct(
        protected CongeService $congeService
    ) {}

    /**
     * Get all leave requests (paginated)
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 20);
        $conges = $this->congeService->getAll();

        // Manual pagination since service returns enriched collection
        $page = $request->integer('page', 1);
        $total = $conges->count();
        $items = $conges->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $items,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage),
        ]);
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
     * Get pending leave requests (cached for 60s)
     */
    public function enAttente(): JsonResponse
    {
        $conges = Cache::remember('conges_en_attente', 300, fn () =>
            $this->congeService->getEnAttente()
        );

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
        $data = $request->validated();

        // Handle medical file upload for sick leave
        if ($request->hasFile('medical_file')) {
            $file = $request->file('medical_file');
            $filename = time() . '_' . $file->getClientOriginalName();
            $file->storeAs('medical_files', $filename, 'public');
            $data['medical_file'] = $filename;
        }

        $result = $this->congeService->demander(
            $request->user()->id,
            $data
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
        $motif = $request->input('motif');
        $success = $this->congeService->refuser($id, $request->user()->id, $motif);

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

    /**
     * Download medical file
     */
    public function downloadMedicalFile(int $id): \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
    {
        $conge = $this->congeService->getById($id);

        if (!$conge || !$conge->medical_file) {
            return response()->json([
                'message' => 'Fichier non trouvé.',
            ], 404);
        }

        $filePath = storage_path('app/public/medical_files/' . $conge->medical_file);

        if (!file_exists($filePath)) {
            return response()->json([
                'message' => 'Fichier non trouvé.',
            ], 404);
        }

        return response()->download($filePath);
    }
}
