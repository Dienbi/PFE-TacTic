<?php

namespace App\Http\Controllers\Api;

use App\Services\AIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class AIController extends Controller
{
    private AIService $aiService;

    public function __construct(AIService $aiService)
    {
        $this->aiService = $aiService;
    }

    // ─── Attendance Predictions ─────────────────────────────────

    /**
     * GET /api/ai/predictions/attendance
     * Get attendance predictions for all employees.
     */
    public function attendancePredictionsAll(): JsonResponse
    {
        return response()->json($this->aiService->getAttendancePredictionsAll());
    }

    /**
     * GET /api/ai/predictions/attendance/{userId}
     * Get 7-day attendance forecast for a single employee.
     */
    public function attendancePrediction(int $userId): JsonResponse
    {
        return response()->json($this->aiService->getAttendancePrediction($userId));
    }

    // ─── Performance Scores ─────────────────────────────────────

    /**
     * GET /api/ai/predictions/performance
     * Get performance scores for all employees.
     */
    public function performanceScoresAll(): JsonResponse
    {
        return response()->json($this->aiService->getPerformanceScoresAll());
    }

    /**
     * GET /api/ai/predictions/performance/{userId}
     * Get performance score for a single employee.
     */
    public function performanceScore(int $userId): JsonResponse
    {
        return response()->json($this->aiService->getPerformanceScore($userId));
    }

    // ─── Dashboard KPIs ─────────────────────────────────────────

    /**
     * GET /api/ai/dashboard-kpis
     * Get aggregated AI-powered KPIs.
     */
    public function dashboardKPIs(): JsonResponse
    {
        return response()->json($this->aiService->getDashboardKPIs());
    }

    // ─── Job Matching ────────────────────────────────────────────

    /**
     * GET /api/ai/match/{jobPostId}
     * Get AI candidate recommendations for a job post.
     */
    public function matchCandidates(int $jobPostId): JsonResponse
    {
        return response()->json($this->aiService->getMatchRecommendations($jobPostId));
    }

    // ─── Training ────────────────────────────────────────────────

    /**
     * POST /api/ai/train/{model}
     * Trigger model training (attendance|performance|matching|all).
     */
    public function train(string $model): JsonResponse
    {
        $allowed = ['attendance', 'performance', 'matching', 'all'];
        if (!in_array($model, $allowed)) {
            return response()->json([
                'error' => 'Invalid model. Choose from: ' . implode(', ', $allowed),
            ], 400);
        }

        return response()->json($this->aiService->triggerTraining($model));
    }

    /**
     * GET /api/ai/train/status
     * Get training status for all models.
     */
    public function trainingStatus(): JsonResponse
    {
        return response()->json($this->aiService->getTrainingStatus());
    }

    // ─── Health ──────────────────────────────────────────────────

    /**
     * GET /api/ai/health
     * Check AI service health.
     */
    public function health(): JsonResponse
    {
        return response()->json($this->aiService->healthCheck());
    }
}
