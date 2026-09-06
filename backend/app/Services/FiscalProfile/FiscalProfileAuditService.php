<?php

namespace App\Services\FiscalProfile;

use App\Repositories\Payroll\AuditLogRepository;

/**
 * FiscalProfileAuditService
 *
 * Single Responsibility: Log all fiscal profile-related actions to the audit log.
 * Provides specialized logging methods for fiscal profile operations.
 */
class FiscalProfileAuditService
{
    private AuditLogRepository $auditLogRepository;

    public function __construct(AuditLogRepository $auditLogRepository)
    {
        $this->auditLogRepository = $auditLogRepository;
    }

    /**
     * Log a fiscal profile assignment.
     *
     * @param string $actorId
     * @param string $assignmentId
     * @param string|null $aiMessageId
     * @param array $details
     * @return void
     */
    public function logProfileAssigned(string $actorId, string $assignmentId, ?string $aiMessageId = null, array $details = []): void
    {
        $data = [
            'actor_id' => $actorId,
            'action' => $aiMessageId ? 'fiscal_profile.profile_assigned_via_ai' : 'fiscal_profile.profile_assigned_manual',
            'entity_type' => 'EmployeeFiscalProfileAssignment',
            'entity_id' => $assignmentId,
            'details_json' => $details,
        ];

        if ($aiMessageId) {
            $data['source_ai_chat_message_id'] = $aiMessageId;
        }

        $this->auditLogRepository->create($data);
    }

    /**
     * Log a bulk fiscal profile assignment via AI.
     *
     * @param string $actorId
     * @param array $assignmentIds
     * @param string $aiMessageId
     * @param array $details
     * @return void
     */
    public function logBulkAssignedViaAi(string $actorId, array $assignmentIds, string $aiMessageId, array $details = []): void
    {
        $details['assignment_ids'] = $assignmentIds;
        $details['count'] = count($assignmentIds);

        $this->auditLogRepository->create([
            'actor_id' => $actorId,
            'action' => 'fiscal_profile.bulk_assigned_via_ai',
            'entity_type' => 'EmployeeFiscalProfileAssignment',
            'entity_id' => $assignmentIds[0] ?? null, // Primary assignment
            'source_ai_chat_message_id' => $aiMessageId,
            'details_json' => $details,
        ]);
    }

    /**
     * Log a head-of-family override.
     *
     * @param string $actorId
     * @param string $overrideId
     * @param array $details
     * @return void
     */
    public function logHeadOfFamilyOverride(string $actorId, string $overrideId, array $details = []): void
    {
        $this->auditLogRepository->create([
            'actor_id' => $actorId,
            'action' => 'fiscal_profile.head_of_family_override',
            'entity_type' => 'HeadOfFamilyOverride',
            'entity_id' => $overrideId,
            'details_json' => $details,
        ]);
    }

    /**
     * Log a fiscal profile group creation.
     *
     * @param string $actorId
     * @param string $groupId
     * @param array $details
     * @return void
     */
    public function logGroupCreated(string $actorId, string $groupId, array $details = []): void
    {
        $this->auditLogRepository->create([
            'actor_id' => $actorId,
            'action' => 'fiscal_profile.group_created',
            'entity_type' => 'FiscalProfileGroup',
            'entity_id' => $groupId,
            'details_json' => $details,
        ]);
    }

    /**
     * Log a fiscal profile group deletion.
     *
     * @param string $actorId
     * @param string $groupId
     * @param array $details
     * @return void
     */
    public function logGroupDeleted(string $actorId, string $groupId, array $details = []): void
    {
        $this->auditLogRepository->create([
            'actor_id' => $actorId,
            'action' => 'fiscal_profile.group_deleted',
            'entity_type' => 'FiscalProfileGroup',
            'entity_id' => $groupId,
            'details_json' => $details,
        ]);
    }

    /**
     * Get audit trail for an employee's fiscal profile.
     *
     * @param string $employeeId
     * @return array
     */
    public function getEmployeeFiscalAuditTrail(string $employeeId): array
    {
        $logs = $this->auditLogRepository->getAll();

        $filtered = $logs->filter(function ($log) use ($employeeId) {
            $details = $log['details_json'] ?? [];
            return isset($details['employee_id']) && $details['employee_id'] === $employeeId;
        });

        return [
            'logs' => $filtered,
            'count' => $filtered->count(),
        ];
    }
}
