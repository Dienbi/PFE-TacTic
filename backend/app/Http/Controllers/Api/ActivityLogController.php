<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;

class ActivityLogController extends Controller
{
    /**
     * Get recent activity logs
     */
    public function index(): JsonResponse
    {
        $logs = ActivityLog::with(['user' => function($query) {
            $query->select('id', 'nom', 'prenom', 'role');
        }])
        ->latest()
        ->take(10) // Limit to latest 10
        ->get();

        return response()->json($logs);
    }
}
