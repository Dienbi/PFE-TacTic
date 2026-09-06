<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PerformanceReviewRequest;
use App\Services\PerformanceReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PerformanceReviewController extends Controller
{
    public function __construct(
        protected PerformanceReviewService $performanceReviewService
    ) {
    }

    /**
     * Create a new performance review
     */
    public function store(PerformanceReviewRequest $request): JsonResponse
    {
        try {
            $review = $this->performanceReviewService->create(
                $request->validated(),
                auth()->id()
            );

            return response()->json([
                'message' => 'Feedback créé avec succès.',
                'data' => $review->load(['employee', 'chef']),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Update a performance review
     */
    public function update(PerformanceReviewRequest $request, int $id): JsonResponse
    {
        try {
            $review = $this->performanceReviewService->update(
                $id,
                $request->validated(),
                auth()->id()
            );

            return response()->json([
                'message' => 'Feedback mis à jour avec succès.',
                'data' => $review->load(['employee', 'chef']),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Delete a performance review
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->performanceReviewService->delete($id, auth()->id());

            return response()->json([
                'message' => 'Feedback supprimé avec succès.',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get performance review by ID
     */
    public function show(int $id): JsonResponse
    {
        $review = $this->performanceReviewService->findById($id);

        if (!$review) {
            return response()->json([
                'message' => 'Feedback non trouvé.',
            ], 404);
        }

        return response()->json($review);
    }

    /**
     * Get feedback history for an employee
     */
    public function employeeHistory(int $employeeId): JsonResponse
    {
        // Employees can only view their own history
        if (auth()->user()->role === 'EMPLOYE' && auth()->id() !== $employeeId) {
            return response()->json([
                'message' => 'Non autorisé.',
            ], 403);
        }

        $history = $this->performanceReviewService->getEmployeeHistory($employeeId);

        return response()->json($history);
    }

    /**
     * Get team feedback (for manager)
     */
    public function teamFeedback(): JsonResponse
    {
        $feedback = $this->performanceReviewService->getTeamFeedback(auth()->id());

        return response()->json($feedback);
    }

    /**
     * Get all feedback (for HR)
     */
    public function allFeedback(): JsonResponse
    {
        $feedback = $this->performanceReviewService->getAllFeedback();

        return response()->json($feedback);
    }

    /**
     * Get latest feedback for an employee
     */
    public function latestFeedback(int $employeeId): JsonResponse
    {
        $review = $this->performanceReviewService->getLatestByEmployee($employeeId);

        if (!$review) {
            return response()->json([
                'message' => 'Aucun feedback trouvé.',
            ], 404);
        }

        return response()->json($review);
    }
}
