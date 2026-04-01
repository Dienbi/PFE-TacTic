<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class QueryLogMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        // Only log queries when debugging locally to avoid noisy logs in production
        if (!app()->environment('local') && !config('app.debug')) {
            return $next($request);
        }

        DB::enableQueryLog();
        $start = microtime(true);

        $response = $next($request);

        $durationMs = (microtime(true) - $start) * 1000;
        $queries = DB::getQueryLog();

        Log::info('DB query log', [
            'path' => $request->path(),
            'method' => $request->method(),
            'query_count' => count($queries),
            'total_ms' => round($durationMs, 2),
            'queries' => array_map(static function (array $query) {
                return [
                    'sql' => $query['query'],
                    'bindings' => $query['bindings'],
                    'time_ms' => $query['time'] ?? null,
                ];
            }, $queries),
        ]);

        return $response;
    }
}
