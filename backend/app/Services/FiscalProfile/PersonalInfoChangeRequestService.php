<?php

namespace App\Services\FiscalProfile;

use App\Models\PersonalInfoChangeRequest;
use App\Models\Utilisateur;
use App\Repositories\ChangeRequestDocumentRepository;
use App\Repositories\PersonalInfoChangeRequestRepository;
use App\Services\Notification\NotificationService;
use App\Enums\NotificationType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PersonalInfoChangeRequestService
{
    public function __construct(
        private PersonalInfoChangeRequestRepository $changeRequestRepository,
        private ChangeRequestDocumentRepository $documentRepository,
        private FiscalProfileAssignmentService $assignmentService,
        private HeadOfFamilyComputationService $headOfFamilyComputation,
        private NotificationService $notificationService
    ) {
    }

    /**
     * Submit a new personal info change request.
     */
    public function submitRequest(int $employeeId, array $data): PersonalInfoChangeRequest
    {
        // Check if employee already has an active request
        $activeRequest = $this->changeRequestRepository->getActiveForEmployee($employeeId);
        if ($activeRequest) {
            throw new \Exception('You already have an active change request. Please wait for it to be reviewed.');
        }

        // Get employee data for head of family computation
        $employee = Utilisateur::find($employeeId);
        if (!$employee) {
            throw new \Exception('Employee not found.');
        }

        // Compute head of family preview
        $gender = $employee->gender;
        $maritalStatus = $data['requested_marital_status'] ?? $employee->marital_status;
        $childrenCount = $data['requested_children_count'] ?? $employee->children_count;

        $computedHeadOfFamily = $this->headOfFamilyComputation->compute(
            $gender,
            $maritalStatus,
            $childrenCount
        );

        // Create the change request
        $requestData = array_merge($data, [
            'id' => (string) Str::uuid(),
            'employee_id' => $employeeId,
            'computed_head_of_family_preview' => $computedHeadOfFamily,
            'status' => 'pending',
            'submitted_at' => now(),
        ]);

        return $this->changeRequestRepository->create($requestData);
    }

    /**
     * Approve a personal info change request and reassign fiscal profile.
     */
    public function approveRequest(string $requestId, int $hrUserId): array
    {
        $request = PersonalInfoChangeRequest::find($requestId);
        if (!$request) {
            throw new \Exception('Change request not found.');
        }

        if ($request->status !== 'pending') {
            throw new \Exception('Only pending requests can be approved.');
        }

        // Validate required documents are verified
        $this->validateRequiredDocuments($request);

        DB::beginTransaction();
        try {
            // Update employee's personal info
            $employee = Utilisateur::find($request->employee_id);
            if (!$employee) {
                throw new \Exception('Employee not found.');
            }

            $oldMaritalStatus = $employee->marital_status;
            $oldChildrenCount = $employee->children_count;

            // Apply changes
            if ($request->requested_marital_status) {
                $employee->marital_status = $request->requested_marital_status;
            }
            if ($request->requested_children_count !== null) {
                $employee->children_count = $request->requested_children_count;
            }
            if ($request->requested_disabled_children_count !== null) {
                $employee->disabled_children_count = $request->requested_disabled_children_count;
            }
            if ($request->requested_student_children_count !== null) {
                $employee->student_non_scholarship_children_count = $request->requested_student_children_count;
            }
            $employee->save();

            // Reassign fiscal profile
            $groupAttributes = [
                'gender' => $employee->gender,
                'marital_status' => $employee->marital_status,
                'children_count' => $employee->children_count,
                'disabled_children_count' => $employee->disabled_children_count ?? 0,
                'student_non_scholarship_children_count' => $employee->student_non_scholarship_children_count ?? 0,
            ];

            \Log::info('Assigning fiscal profile', [
                'employee_id' => $request->employee_id,
                'employee_id_type' => gettype($request->employee_id),
                'group_attributes' => $groupAttributes,
                'effective_date' => $request->claimed_effective_date,
                'hr_user_id' => $hrUserId,
                'hr_user_id_type' => gettype($hrUserId),
            ]);

            $assignment = $this->assignmentService->assignProfile(
                (string) $request->employee_id,
                $groupAttributes,
                $request->claimed_effective_date,
                (string) $hrUserId
            );

            // Update request status
            $this->changeRequestRepository->updateStatus($requestId, 'approved', $hrUserId);

            // Check if affects locked payslips (simplified check - in production, query actual payslips)
            $affectsLockedPayslips = $this->checkAffectsLockedPayslips($request->employee_id, $request->claimed_effective_date);
            if ($affectsLockedPayslips) {
                $this->changeRequestRepository->markAsAffectsLockedPayslips($requestId);
            }

            // Notify employee
            $this->notificationService->createNotification(
                $request->employee_id,
                NotificationType::SOCIAL_STATUS_APPROVED,
                [
                    'title' => 'Personal Info Change Approved',
                    'message' => 'Your personal information changes have been approved and your fiscal profile has been updated.',
                    'data' => [
                        'request_id' => $requestId,
                        'old_marital_status' => $oldMaritalStatus,
                        'new_marital_status' => $employee->marital_status,
                        'old_children_count' => $oldChildrenCount,
                        'new_children_count' => $employee->children_count,
                    ]
                ]
            );

            // Notify HR of reassignment
            $this->notifyHROfReassignment($hrUserId, $employee, $assignment);

            DB::commit();

            return [
                'success' => true,
                'message' => 'Change request approved and fiscal profile reassigned.',
                'assignment' => $assignment,
                'affects_locked_payslips' => $affectsLockedPayslips,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to approve change request', [
                'request_id' => $requestId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Reject a personal info change request.
     */
    public function rejectRequest(string $requestId, string $reason, int $hrUserId): bool
    {
        $request = PersonalInfoChangeRequest::find($requestId);
        if (!$request) {
            throw new \Exception('Change request not found.');
        }

        if ($request->status !== 'pending') {
            throw new \Exception('Only pending requests can be rejected.');
        }

        $this->changeRequestRepository->updateStatus($requestId, 'rejected', $hrUserId, $reason);

        // Notify employee
        $this->notificationService->createNotification(
            $request->employee_id,
            NotificationType::SOCIAL_STATUS_REJECTED,
            [
                'title' => 'Personal Info Change Rejected',
                'message' => "Your personal information change was rejected. Reason: {$reason}",
                'data' => ['request_id' => $requestId, 'rejection_reason' => $reason]
            ]
        );

        return true;
    }

    /**
     * Mark request as needs more info.
     */
    public function requestMoreInfo(string $requestId, string $reason, int $hrUserId): bool
    {
        $request = PersonalInfoChangeRequest::find($requestId);
        if (!$request) {
            throw new \Exception('Change request not found.');
        }

        $this->changeRequestRepository->updateStatus($requestId, 'needs_more_info', $hrUserId, $reason);

        // Notify employee
        $this->notificationService->createNotification(
            $request->employee_id,
            NotificationType::SOCIAL_STATUS_REJECTED,
            [
                'title' => 'Additional Information Required',
                'message' => "Your change request needs additional information. Reason: {$reason}",
                'data' => ['request_id' => $requestId, 'reason' => $reason]
            ]
        );

        return true;
    }

    /**
     * Validate that all required documents are verified.
     */
    private function validateRequiredDocuments(PersonalInfoChangeRequest $request): void
    {
        $requiredDocTypes = $this->getRequiredDocumentTypes($request);
        $documents = $this->documentRepository->getByChangeRequest($request->id);

        foreach ($requiredDocTypes as $docType) {
            $doc = $documents->firstWhere('document_type', $docType);
            if (!$doc) {
                throw new \Exception("Missing required document: {$docType}");
            }
            if (!$doc->verified_by_hr) {
                throw new \Exception("Document not verified: {$docType}");
            }
        }

        // Check for children count decrease
        $employee = Utilisateur::find($request->employee_id);
        if ($request->requested_children_count !== null &&
            $request->requested_children_count < $employee->children_count) {
            throw new \Exception('Children count decrease requires manual review. Please use "Request More Info".');
        }
    }

    /**
     * Get required document types based on the change.
     */
    private function getRequiredDocumentTypes(PersonalInfoChangeRequest $request): array
    {
        $required = [];
        $employee = Utilisateur::find($request->employee_id);

        // Marital status changes
        if ($request->requested_marital_status) {
            $from = $employee->marital_status;
            $to = $request->requested_marital_status;

            if ($from === 'single' && $to === 'married') {
                $required[] = 'marriage_certificate';
            } elseif ($from === 'married' && $to === 'divorced') {
                $required[] = 'divorce_judgment';
            } elseif ($from === 'married' && $to === 'widowed') {
                $required[] = 'death_certificate';
            }
        }

        // Children count increase
        if ($request->requested_children_count !== null &&
            $request->requested_children_count > $employee->children_count) {
            $newChildren = $request->requested_children_count - $employee->children_count;
            for ($i = 0; $i < $newChildren; $i++) {
                $required[] = 'birth_certificate';
            }
        }

        // Disabled children
        if ($request->requested_disabled_children_count > 0) {
            $required[] = 'disability_certificate';
        }

        // Student children
        if ($request->requested_student_children_count > 0) {
            $required[] = 'school_enrollment_certificate';
        }

        return $required;
    }

    /**
     * Check if the change affects locked payslips.
     * Simplified implementation - in production, query actual payslip data.
     */
    private function checkAffectsLockedPayslips(int $employeeId, string $effectiveDate): bool
    {
        // TODO: Implement actual check against payslips table
        // For now, return false as placeholder
        return false;
    }

    /**
     * Notify HR of fiscal profile reassignment.
     */
    private function notifyHROfReassignment(int $hrUserId, Utilisateur $employee, $assignment): void
    {
        $this->notificationService->createNotification(
            $hrUserId,
            NotificationType::FISCAL_PROFILE_REASSIGNED,
            [
                'title' => 'Fiscal Profile Reassigned',
                'message' => "Employee {$employee->nom_complet} has been reassigned to fiscal profile: {$assignment->fiscalProfileGroup->label}",
                'data' => [
                    'employee_id' => $employee->id,
                    'employee_name' => $employee->nom_complet,
                    'fiscal_profile_group_id' => $assignment->fiscal_profile_group_id,
                    'fiscal_profile_label' => $assignment->fiscalProfileGroup->label,
                    'effective_from' => $assignment->effective_from,
                ]
            ]
        );
    }
}
