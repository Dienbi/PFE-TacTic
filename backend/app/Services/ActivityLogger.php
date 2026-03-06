<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Request;

class ActivityLogger
{
    public static function log(string $action, string $description = null, ?int $userId = null)
    {
        $log = ActivityLog::create([
            'user_id' => $userId ?? auth()->id(),
            'action' => $action,
            'description' => $description,
            'ip_address' => Request::ip(),
        ]);

        try {
            // Load user relation for broadcasting
            $log->load(['user' => fn ($q) => $q->select('id', 'nom', 'prenom', 'role')]);
            event(new \App\Events\NewActivityLog($log));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to broadcast activity log: " . $e->getMessage());
        }
    }
}
