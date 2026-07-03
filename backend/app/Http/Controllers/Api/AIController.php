<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

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
        $data = Cache::remember('ai_attendance_all', 600, function () {
            return $this->aiService->getAttendancePredictionsAll();
        });

        return response()->json($data);
    }

    /**
     * GET /api/ai/predictions/attendance/{userId}
     * Get 7-day attendance forecast for a single employee.
     */
    public function attendancePrediction(int $userId): JsonResponse
    {
        $data = Cache::remember("ai_attendance_{$userId}", 600, function () use ($userId) {
            return $this->aiService->getAttendancePrediction($userId);
        });

        return response()->json($data);
    }

    // ─── Performance Scores ─────────────────────────────────────

    /**
     * GET /api/ai/predictions/performance
     * Get performance scores for all employees.
     */
    public function performanceScoresAll(): JsonResponse
    {
        $data = Cache::remember('ai_performance_all', 600, function () {
            return $this->aiService->getPerformanceScoresAll();
        });

        return response()->json($data);
    }

    /**
     * GET /api/ai/predictions/performance/{userId}
     * Get performance score for a single employee.
     */
    public function performanceScore(int $userId): JsonResponse
    {
        $data = Cache::remember("ai_performance_{$userId}", 600, function () use ($userId) {
            return $this->aiService->getPerformanceScore($userId);
        });

        return response()->json($data);
    }

    // ─── Dashboard KPIs ─────────────────────────────────────────

    /**
     * GET /api/ai/dashboard-kpis
     * Get aggregated AI-powered KPIs.
     */
    public function dashboardKPIs(): JsonResponse
    {
        $data = Cache::remember('ai_dashboard_kpis', 600, function () {
            return $this->aiService->getDashboardKPIs();
        });

        return response()->json($data);
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
        if (! in_array($model, $allowed)) {
            return response()->json([
                'error' => 'Invalid model. Choose from: '.implode(', ', $allowed),
            ], 400);
        }

        // Clear AI cache on training
        Cache::forget('ai_attendance_all');
        Cache::forget('ai_performance_all');
        Cache::forget('ai_dashboard_kpis');

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
