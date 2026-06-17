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
            $timeout = (int) config('services.ai.dashboard_timeout', 15);

            $responses = \Illuminate\Support\Facades\Http::pool(function ($pool) use ($timeout) {
                return [
                    $pool->as('attendance')->timeout($timeout)->get($this->baseUrl.'/api/predictions/attendance/all'),
                    $pool->as('performance')->timeout($timeout)->get($this->baseUrl.'/api/predictions/performance/all'),
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

            $kpis = $this->buildDashboardKpis($attendanceResponse, $performanceResponse, $attendance, $performance);

            $result = [
                'ai_attendance' => $attendance,
                'ai_performance' => $performance,
                'ai_kpis' => $kpis,
            ];

            if (! empty($attendance) || ! empty($performance)) {
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

    /**
     * Build dashboard KPIs locally from attendance/performance responses
     * to avoid a third slow round-trip to the AI service.
     */
    private function buildDashboardKpis(
        mixed $attendanceResponse,
        mixed $performanceResponse,
        array $attendanceSlice,
        array $performanceSlice
    ): array {
        $generatedAt = now()->toIso8601String();
        $attendanceKpis = null;
        $performanceKpis = null;

        if ($attendanceResponse instanceof Response && $attendanceResponse->successful()) {
            $allAttendance = $attendanceResponse->json() ?? [];
            if (! empty($allAttendance)) {
                $risks = array_column($allAttendance, 'avg_absence_risk');
                $high = count(array_filter($allAttendance, fn ($r) => ($r['risk_level'] ?? '') === 'high'));
                $medium = count(array_filter($allAttendance, fn ($r) => ($r['risk_level'] ?? '') === 'medium'));
                $withAlerts = count(array_filter($allAttendance, fn ($r) => ! empty($r['alert_dates'])));

                $attendanceKpis = [
                    'predicted_absence_rate' => round((array_sum($risks) / count($risks)) * 100, 1),
                    'high_risk_employees' => $high,
                    'medium_risk_employees' => $medium,
                    'employees_with_alerts' => $withAlerts,
                    'total_analyzed' => count($allAttendance),
                    'top_at_risk' => array_slice($allAttendance, 0, 5),
                ];
            }
        }

        if ($performanceResponse instanceof Response && $performanceResponse->successful()) {
            $allPerformance = $performanceResponse->json() ?? [];
            if (! empty($allPerformance)) {
                $scores = array_column($allPerformance, 'performance_score');
                $grades = ['A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'F' => 0];
                foreach ($allPerformance as $row) {
                    $g = $row['grade'] ?? 'F';
                    if (isset($grades[$g])) {
                        $grades[$g]++;
                    }
                }

                $performanceKpis = [
                    'avg_performance' => round(array_sum($scores) / count($scores), 1),
                    'min_performance' => round(min($scores), 1),
                    'max_performance' => round(max($scores), 1),
                    'total_scored' => count($scores),
                    'grade_distribution' => $grades,
                    'top_performers' => array_slice($allPerformance, 0, 5),
                    'needs_improvement' => count($allPerformance) >= 5
                        ? array_slice(array_reverse($allPerformance), 0, 5)
                        : [],
                ];
            }
        }

        return [
            'generated_at' => $generatedAt,
            'attendance_predictions' => $attendanceKpis,
            'performance_scores' => $performanceKpis,
        ];
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
