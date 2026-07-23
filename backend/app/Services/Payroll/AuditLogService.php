<?php

namespace App\Services\Payroll;

use App\Repositories\Payroll\AuditLogRepository;

class AuditLogService
{
    private AuditLogRepository $auditLogRepository;

    public function __construct(AuditLogRepository $auditLogRepository)
    {
        $this->auditLogRepository = $auditLogRepository;
    }

    public function logAction(string $actorId, string $action, string $entityType, string $entityId, array $details = null): array
    {
        $log = $this->auditLogRepository->create([
            'actor_id' => $actorId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'details_json' => $details,
        ]);

        return [
            'log' => $log->fresh(['actor']),
        ];
    }

    public function getAuditTrail(string $entityType, string $entityId): array
    {
        $logs = $this->auditLogRepository->findByEntity($entityType, $entityId);

        return [
            'logs' => $logs,
            'count' => $logs->count(),
        ];
    }

    public function getActionLogs(string $action): array
    {
        $logs = $this->auditLogRepository->findByAction($action);

        return [
            'logs' => $logs,
            'count' => $logs->count(),
        ];
    }

    public function getActorLogs(string $actorId): array
    {
        $logs = $this->auditLogRepository->findByActor($actorId);

        return [
            'logs' => $logs,
            'count' => $logs->count(),
        ];
    }

    public function getAllLogs(array $filters = []): array
    {
        $query = \App\Models\AuditLog::with(['actor']);

        // Apply filters if provided
        if (isset($filters['action']) && !empty($filters['action'])) {
            $query->where('action', 'like', '%' . $filters['action'] . '%');
        }

        if (isset($filters['entity_type']) && !empty($filters['entity_type'])) {
            $query->where('entity_type', 'like', '%' . $filters['entity_type'] . '%');
        }

        if (isset($filters['actor_id']) && !empty($filters['actor_id'])) {
            $query->where('actor_id', $filters['actor_id']);
        }

        if (isset($filters['date_from']) && !empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to']) && !empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        $logs = $query->orderBy('created_at', 'desc')->get();

        return [
            'logs' => $logs,
            'count' => $logs->count(),
        ];
    }

    public function getLogStatistics(array $filters = []): array
    {
        $logs = $this->auditLogRepository->getAll();

        // Apply filters if provided
        if (isset($filters['date_from'])) {
            $logs = $logs->where('created_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $logs = $logs->where('created_at', '<=', $filters['date_to']);
        }

        $totalLogs = $logs->count();

        $byAction = $logs->groupBy('action')->map(function ($group) {
            return [
                'count' => $group->count(),
            ];
        });

        $byEntityType = $logs->groupBy('entity_type')->map(function ($group) {
            return [
                'count' => $group->count(),
            ];
        });

        $byActor = $logs->groupBy('actor_id')->map(function ($group) {
            return [
                'count' => $group->count(),
            ];
        });

        return [
            'statistics' => [
                'total_logs' => $totalLogs,
                'by_action' => $byAction,
                'by_entity_type' => $byEntityType,
                'by_actor' => $byActor,
            ],
        ];
    }
}
