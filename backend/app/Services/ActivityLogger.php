<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Request;

class ActivityLogger
{
    public static function log(string $action, string $description = null, ?int $userId = null)
    {
        try {
            // Use provided ID or current authenticated user ID
            $uid = $userId;
            if (!$uid && auth()->check()) {
                $uid = auth()->id();
            }

            ActivityLog::create([
                'user_id' => $uid,
                'action' => $action,
                'description' => $description,
                'ip_address' => Request::ip(),
            ]);
        } catch (\Exception $e) {
            // Never let logging crash the main request
            \Log::error("ActivityLog failed: " . $e->getMessage());
        }
    }
}
