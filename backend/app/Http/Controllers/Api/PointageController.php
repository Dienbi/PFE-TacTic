<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PointageService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PointageController extends Controller
{
    public function __construct(
        protected PointageService $pointageService
    ) {}

    /**
     * Get today's attendance for current user
     */
    public function today(Request $request): JsonResponse
    {
        $pointage = $this->pointageService->getTodayPointage($request->user()->id);

        return response()->json($pointage);
    }

    /**
     * Get attendance for current user
     */
    public function mesPointages(Request $request): JsonResponse
    {
        $pointages = $this->pointageService->getByUtilisateur($request->user()->id);

        return response()->json($pointages);
    }

    /**
     * Get attendance by user ID
     */
    public function byUtilisateur(int $utilisateurId): JsonResponse
    {
        $pointages = $this->pointageService->getByUtilisateur($utilisateurId);

        return response()->json($pointages);
    }

    /**
     * Get attendance by date
     */
    public function byDate(Request $request): JsonResponse
    {
        $date = Carbon::parse($request->date);
        $pointages = $this->pointageService->getByDate($date);

        return response()->json($pointages);
    }

    /**
     * Get attendance summary for dashboard
     */
    public function summary(Request $request): JsonResponse
    {
        $date = $request->has('date') ? Carbon::parse($request->date) : Carbon::today();
        $summary = $this->pointageService->getSummary($date);

        return response()->json($summary);
    }

    /**
     * Clock in
     */
    public function pointerEntree(Request $request): JsonResponse
    {
        $pointage = $this->pointageService->pointerEntree($request->user()->id);

        return response()->json([
            'message' => 'Entrée enregistrée.',
            'pointage' => $pointage,
        ]);
    }

    /**
     * Clock out
     */
    public function pointerSortie(Request $request): JsonResponse
    {
        $isAutoCheckout = $request->get('auto', false);
        $pointage = $this->pointageService->pointerSortie($request->user()->id, $isAutoCheckout);

        return response()->json([
            'message' => 'Sortie enregistrée.',
            'pointage' => $pointage,
        ]);
    }

    /**
     * Mark absence
     */
    public function marquerAbsence(Request $request): JsonResponse
    {
        $pointage = $this->pointageService->marquerAbsence(
            $request->utilisateur_id,
            Carbon::parse($request->date),
            $request->get('justifiee', false)
        );

        return response()->json($pointage, 201);
    }

    /**
     * Justify absence
     */
    public function justifierAbsence(int $id): JsonResponse
    {
        $this->pointageService->justifierAbsence($id);

        return response()->json([
            'message' => 'Absence justifiée.',
        ]);
    }

    /**
     * Get attendance stats
     */
    public function stats(Request $request): JsonResponse
    {
        $startDate = Carbon::parse($request->get('start_date', Carbon::now()->startOfMonth()));
        $endDate = Carbon::parse($request->get('end_date', Carbon::now()->endOfMonth()));
        $utilisateurId = $request->get('utilisateur_id', $request->user()->id);

        $stats = $this->pointageService->getStats($utilisateurId, $startDate, $endDate);

        return response()->json($stats);
    }

    /**
     * Get attendance by period
     */
    public function byPeriod(Request $request): JsonResponse
    {
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        $utilisateurId = $request->get('utilisateur_id', $request->user()->id);

        $pointages = $this->pointageService->getByPeriod($utilisateurId, $startDate, $endDate);

        return response()->json($pointages);
    }

    /**
     * Update attendance
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $this->pointageService->update($id, $request->all());

        return response()->json([
            'message' => 'Pointage mis à jour.',
        ]);
    }

    /**
     * Delete attendance
     */
    public function destroy(int $id): JsonResponse
    {
        $this->pointageService->delete($id);

        return response()->json([
            'message' => 'Pointage supprimé.',
        ]);
    }
}
