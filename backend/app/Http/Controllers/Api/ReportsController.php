<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AIService;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ReportsController extends Controller
{
    public function __construct(
        private AIService $aiService
    ) {
    }

    /**
     * AI analytics summary for the Reports page (RH only).
     */
    public function aiReports(Request $request): JsonResponse
    {
        $attendanceLimit = min(max((int) $request->input('attendance_limit', 10), 1), 50);
        $performanceLimit = min(max((int) $request->input('performance_limit', 10), 1), 50);

        $cacheKey = CacheService::KEY_REPORTS_AI."_{$attendanceLimit}_{$performanceLimit}";

        if ($request->boolean('noCache')) {
            Cache::forget($cacheKey);
        } elseif (Cache::has($cacheKey)) {
            return response()->json(Cache::get($cacheKey));
        }

        $data = $this->fetchAiReports($attendanceLimit, $performanceLimit);

        if ($data['ai_available']) {
            Cache::put($cacheKey, $data, 600);
        }

        return response()->json($data);
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchAiReports(int $attendanceLimit, int $performanceLimit): array
    {
        try {
            $ai = $this->aiService->getDashboardAIData($attendanceLimit, $performanceLimit);
            $hasData = ! empty($ai['ai_attendance']) || ! empty($ai['ai_performance']);

            return [
                'ai_available' => $hasData,
                'attendance_predictions' => $ai['ai_attendance'] ?? [],
                'performance_scores' => $ai['ai_performance'] ?? [],
                'ai_kpis' => $ai['ai_kpis'] ?? [],
            ];
        } catch (\Throwable $e) {
            Log::warning('reports.ai.failed', ['message' => $e->getMessage()]);

            return [
                'ai_available' => false,
                'attendance_predictions' => [],
                'performance_scores' => [],
                'ai_kpis' => [],
            ];
        }
    }
}
