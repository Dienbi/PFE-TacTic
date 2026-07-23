<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Controller;
use App\Services\Payroll\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogController extends Controller
{
    private AuditLogService $service;

    public function __construct(AuditLogService $service)
    {
        $this->service = $service;
    }

    public function logAction(Request $request)
    {
        $request->validate([
            'action' => 'required|string',
            'entity_type' => 'required|string',
            'entity_id' => 'required|string',
            'details' => 'nullable|array',
        ]);

        $result = $this->service->logAction(Auth::id(), $request->action, $request->entity_type, $request->entity_id, $request->details);

        return response()->json($result, 201);
    }

    public function getAuditTrail(Request $request)
    {
        $request->validate([
            'entity_type' => 'required|string',
            'entity_id' => 'required|string',
        ]);

        $result = $this->service->getAuditTrail($request->entity_type, $request->entity_id);

        return response()->json($result);
    }

    public function getActionLogs(Request $request)
    {
        $request->validate([
            'action' => 'required|string',
        ]);

        $result = $this->service->getActionLogs($request->action);

        return response()->json($result);
    }

    public function getActorLogs(string $actorId)
    {
        $result = $this->service->getActorLogs($actorId);

        return response()->json($result);
    }

    public function getAllLogs(Request $request)
    {
        $request->validate([
            'action' => 'nullable|string',
            'entity_type' => 'nullable|string',
            'actor_id' => 'nullable|string',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $result = $this->service->getAllLogs($request->all());

        return response()->json($result);
    }

    public function getStatistics(Request $request)
    {
        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $result = $this->service->getLogStatistics($request->all());

        return response()->json($result);
    }
}
