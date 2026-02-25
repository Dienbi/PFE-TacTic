<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.ai.url', 'http://127.0.0.1:8001');
    }

    // ─── Attendance Predictions ─────────────────────────────────

    /**
     * Get 7-day attendance forecast for a single employee.
     */
    public function getAttendancePrediction(int $userId): array
    {
        return $this->get("/api/predictions/attendance/{$userId}");
    }

    /**
     * Get attendance forecasts for all employees.
     */
    public function getAttendancePredictionsAll(): array
    {
        return $this->get('/api/predictions/attendance/all');
    }

    // ─── Performance Scores ─────────────────────────────────────

    /**
     * Get AI performance score for a single employee.
     */
    public function getPerformanceScore(int $userId): array
    {
        return $this->get("/api/predictions/performance/{$userId}");
    }

    /**
     * Get performance scores for all employees.
     */
    public function getPerformanceScoresAll(): array
    {
        return $this->get('/api/predictions/performance/all');
    }

    // ─── Dashboard KPIs ─────────────────────────────────────────

    /**
     * Get aggregated AI-powered dashboard KPIs.
     */
    public function getDashboardKPIs(): array
    {
        return $this->get('/api/predictions/dashboard-kpis');
    }

    // ─── Job Matching ────────────────────────────────────────────

    /**
     * Get AI-powered candidate recommendations for a job post.
     */
    public function getMatchRecommendations(int $jobPostId): array
    {
        return $this->post('/api/match', [
            'job_post_id' => $jobPostId,
        ]);
    }

    // ─── Training ────────────────────────────────────────────────

    /**
     * Trigger model training.
     *
     * @param string $model attendance|performance|matching|all
     */
    public function triggerTraining(string $model): array
    {
        return $this->post("/api/train/{$model}");
    }

    /**
     * Get training status for all models.
     */
    public function getTrainingStatus(): array
    {
        return $this->get('/api/train/status');
    }

    // ─── Health ──────────────────────────────────────────────────

    /**
     * Check if the AI service is up.
     */
    public function healthCheck(): array
    {
        return $this->get('/health');
    }

    // ─── HTTP Helpers ────────────────────────────────────────────

    private function get(string $path): array
    {
        try {
            $response = Http::timeout(120)
                ->get($this->baseUrl . $path);

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning("AI Service GET {$path} failed: {$response->status()}", [
                'body' => $response->body(),
            ]);

            return [
                'error' => true,
                'status' => $response->status(),
                'message' => $response->json()['detail'] ?? 'AI Service request failed',
            ];
        } catch (\Exception $e) {
            Log::error("AI Service unreachable: {$e->getMessage()}");
            return [
                'error' => true,
                'message' => 'AI service is not available. Make sure it is running on ' . $this->baseUrl,
            ];
        }
    }

    private function post(string $path, array $data = []): array
    {
        try {
            $response = Http::timeout(300) // Training can be slow
                ->post($this->baseUrl . $path, $data);

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning("AI Service POST {$path} failed: {$response->status()}", [
                'body' => $response->body(),
            ]);

            return [
                'error' => true,
                'status' => $response->status(),
                'message' => $response->json()['detail'] ?? 'AI Service request failed',
            ];
        } catch (\Exception $e) {
            Log::error("AI Service unreachable: {$e->getMessage()}");
            return [
                'error' => true,
                'message' => 'AI service is not available. Make sure it is running on ' . $this->baseUrl,
            ];
        }
    }
}
