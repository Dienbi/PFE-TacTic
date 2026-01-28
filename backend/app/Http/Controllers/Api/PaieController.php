<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaieRequest;
use App\Services\PaieService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaieController extends Controller
{
    public function __construct(
        protected PaieService $paieService
    ) {}

    /**
     * Get all payrolls
     */
    public function index(): JsonResponse
    {
        $paies = $this->paieService->getAll();

        return response()->json($paies);
    }

    /**
     * Get payroll by ID
     */
    public function show(int $id): JsonResponse
    {
        $paie = $this->paieService->getById($id);

        if (!$paie) {
            return response()->json([
                'message' => 'Paie non trouvée.',
            ], 404);
        }

        return response()->json($paie);
    }

    /**
     * Get payrolls for current user
     */
    public function mesPaies(Request $request): JsonResponse
    {
        $paies = $this->paieService->getByUtilisateur($request->user()->id);

        return response()->json($paies);
    }

    /**
     * Get payrolls by user ID
     */
    public function byUtilisateur(int $utilisateurId): JsonResponse
    {
        $paies = $this->paieService->getByUtilisateur($utilisateurId);

        return response()->json($paies);
    }

    /**
     * Generate payroll for user
     */
    public function generer(PaieRequest $request): JsonResponse
    {
        $result = $this->paieService->generer(
            $request->utilisateur_id,
            Carbon::parse($request->periode_debut),
            Carbon::parse($request->periode_fin)
        );

        if (is_array($result) && isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], 400);
        }

        return response()->json($result, 201);
    }

    /**
     * Generate payrolls for all users
     */
    public function genererPourTous(Request $request): JsonResponse
    {
        $results = $this->paieService->genererPourTous(
            Carbon::parse($request->periode_debut),
            Carbon::parse($request->periode_fin)
        );

        return response()->json($results, 201);
    }

    /**
     * Mark payroll as paid
     */
    public function marquerPayee(int $id): JsonResponse
    {
        $this->paieService->marquerPayee($id);

        return response()->json([
            'message' => 'Paie marquée comme payée.',
        ]);
    }

    /**
     * Get unpaid payrolls
     */
    public function nonPayees(): JsonResponse
    {
        $paies = $this->paieService->getNonPayees();

        return response()->json($paies);
    }

    /**
     * Get payroll stats for user
     */
    public function stats(Request $request): JsonResponse
    {
        $utilisateurId = $request->get('utilisateur_id', $request->user()->id);
        $stats = $this->paieService->getStats($utilisateurId);

        return response()->json($stats);
    }

    /**
     * Get total salaries for month
     */
    public function totalMensuel(Request $request): JsonResponse
    {
        $year = $request->get('year', Carbon::now()->year);
        $month = $request->get('month', Carbon::now()->month);

        $total = $this->paieService->getTotalSalaires($year, $month);

        return response()->json([
            'year' => $year,
            'month' => $month,
            'total' => $total,
        ]);
    }

    /**
     * Update payroll
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $this->paieService->update($id, $request->all());

        return response()->json([
            'message' => 'Paie mise à jour.',
        ]);
    }

    /**
     * Delete payroll
     */
    public function destroy(int $id): JsonResponse
    {
        $this->paieService->delete($id);

        return response()->json([
            'message' => 'Paie supprimée.',
        ]);
    }
}
