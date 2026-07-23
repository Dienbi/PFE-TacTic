<?php

namespace App\Repositories\Payroll;

use App\Models\AuditLog;
use Illuminate\Support\Str;

class AuditLogRepository
{
    public function create(array $data): AuditLog
    {
        return AuditLog::create([
            'id' => $data['id'] ?? Str::uuid(),
            'actor_id' => $data['actor_id'],
            'action' => $data['action'],
            'entity_type' => $data['entity_type'],
            'entity_id' => $data['entity_id'],
            'details_json' => $data['details_json'] ?? null,
        ]);
    }

    public function findById(string $id): ?AuditLog
    {
        return AuditLog::with(['actor'])->find($id);
    }

    public function findByAction(string $action): \Illuminate\Database\Eloquent\Collection
    {
        return AuditLog::byAction($action)
            ->with(['actor'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function findByEntity(string $entityType, string $entityId): \Illuminate\Database\Eloquent\Collection
    {
        return AuditLog::byEntity($entityType, $entityId)
            ->with(['actor'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function findByActor(string $actorId): \Illuminate\Database\Eloquent\Collection
    {
        return AuditLog::byActor($actorId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getAll(): \Illuminate\Database\Eloquent\Collection
    {
        return AuditLog::with(['actor'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function logRuleSetConfirmation(string $actorId, string $ruleSetId, array $details): AuditLog
    {
        return $this->create([
            'actor_id' => $actorId,
            'action' => 'rule_set.confirmed',
            'entity_type' => 'FiscalRuleSet',
            'entity_id' => $ruleSetId,
            'details_json' => $details,
        ]);
    }

    public function logPayslipCorrection(string $actorId, string $payslipId, array $details): AuditLog
    {
        return $this->create([
            'actor_id' => $actorId,
            'action' => 'payslip.corrected',
            'entity_type' => 'Payslip',
            'entity_id' => $payslipId,
            'details_json' => $details,
        ]);
    }

    public function logPaymentRecorded(string $actorId, string $paymentId, array $details): AuditLog
    {
        return $this->create([
            'actor_id' => $actorId,
            'action' => 'payment.recorded',
            'entity_type' => 'Payment',
            'entity_id' => $paymentId,
            'details_json' => $details,
        ]);
    }

    public function logRuleImport(string $actorId, string $importLogId, array $details): AuditLog
    {
        return $this->create([
            'actor_id' => $actorId,
            'action' => 'rule_import.created',
            'entity_type' => 'RuleImportLog',
            'entity_id' => $importLogId,
            'details_json' => $details,
        ]);
    }
}
