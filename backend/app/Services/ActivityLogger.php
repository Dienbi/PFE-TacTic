<?php

namespace App\Services;

use App\Events\NewActivityLog;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;

class ActivityLogger
{
    public static function log(string $action, ?string $description = null, ?int $userId = null, bool $broadcast = true)
    {
        $log = ActivityLog::create([
            'user_id' => $userId ?? auth()->id(),
            'action' => $action,
            'description' => $description,
            'ip_address' => Request::ip(),
        ]);

        if (! $broadcast) {
            return;
        }

        try {
            // Load user relation only when broadcasting to reduce overhead on hot paths
            $log->load(['user' => fn ($q) => $q->select('id', 'nom', 'prenom', 'role')]);
            event(new NewActivityLog($log));
        } catch (\Exception $e) {
            Log::warning('Failed to broadcast activity log: '.$e->getMessage());
        }
    }
}
