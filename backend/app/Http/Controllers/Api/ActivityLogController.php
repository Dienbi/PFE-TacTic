<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ActivityLogController extends Controller
{
    /**
     * Get activity logs (paginated, cached)
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 20);
        $page    = $request->integer('page', 1);

        $result = Cache::remember("activity_logs_p{$page}_pp{$perPage}", 300, function () use ($perPage, $page) {
            $total = ActivityLog::count();
            $items = ActivityLog::with(['user' => fn ($q) => $q->select('id', 'nom', 'prenom', 'role')])
                ->latest()
                ->forPage($page, $perPage)
                ->get();

            return [
                'data'         => $items,
                'current_page' => $page,
                'per_page'     => $perPage,
                'total'        => $total,
                'last_page'    => (int) ceil($total / $perPage),
            ];
        });

        return response()->json($result);
    }
}
