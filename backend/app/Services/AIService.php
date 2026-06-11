<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
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

    /**
     * Fetch dashboard AI blocks in parallel to avoid sequential latency.
     */
    public function getDashboardAIData(int $attendanceLimit, int $performanceLimit): array
    {
        // Try to get from cache first to avoid pooling overhead if we have a warm cache
        $cacheKey = \App\Services\CacheService::KEY_AI_DASHBOARD."_{$attendanceLimit}_{$performanceLimit}";
        if (\Illuminate\Support\Facades\Cache::has($cacheKey)) {
            return \Illuminate\Support\Facades\Cache::get($cacheKey);
        }

        try {
            // Aggressive timeout for dashboard: if AI is slow, don't hold up the rest of the stats
            $timeout = (int) config('services.ai.dashboard_timeout', 3);

            $responses = \Illuminate\Support\Facades\Http::pool(function ($pool) use ($timeout) {
                return [
                    $pool->as('attendance')->timeout($timeout)->get($this->baseUrl.'/api/predictions/attendance/all'),
                    $pool->as('performance')->timeout($timeout)->get($this->baseUrl.'/api/predictions/performance/all'),
                    $pool->as('kpis')->timeout($timeout)->get($this->baseUrl.'/api/predictions/dashboard-kpis'),
                ];
            });

            $attendanceResponse = $responses['attendance'] ?? null;
            $attendance = ($attendanceResponse instanceof Response && $attendanceResponse->successful())
                ? array_slice($attendanceResponse->json() ?? [], 0, $attendanceLimit)
                : [];

            $performanceResponse = $responses['performance'] ?? null;
            $performance = ($performanceResponse instanceof Response && $performanceResponse->successful())
                ? array_slice($performanceResponse->json() ?? [], 0, $performanceLimit)
                : [];

            $kpisResponse = $responses['kpis'] ?? null;
            $kpis = ($kpisResponse instanceof Response && $kpisResponse->successful())
                ? ($kpisResponse->json() ?? [])
                : [];

            $result = [
                'ai_attendance' => $attendance,
                'ai_performance' => $performance,
                'ai_kpis' => $kpis,
            ];

            // Only cache if we actually got some AI data to avoid caching empty results during a temporary failure
            if (! empty($attendance) || ! empty($performance) || ! empty($kpis)) {
                \Illuminate\Support\Facades\Cache::put($cacheKey, $result, 600);
            }

            return $result;
        } catch (\Exception $e) {
            Log::error('AI Service dashboard pool failed: '.$e->getMessage());

            return [
                'ai_attendance' => [],
                'ai_performance' => [],
                'ai_kpis' => [],
            ];
        }
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
     * @param  string  $model  attendance|performance|matching|all
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
                ->get($this->baseUrl.$path);

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
                'message' => 'AI service is not available. Make sure it is running on '.$this->baseUrl,
            ];
        }
    }

    private function post(string $path, array $data = []): array
    {
        try {
            $response = Http::timeout(300) // Training can be slow
                ->post($this->baseUrl.$path, $data);

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
                'message' => 'AI service is not available. Make sure it is running on '.$this->baseUrl,
            ];
        }
    }
}
