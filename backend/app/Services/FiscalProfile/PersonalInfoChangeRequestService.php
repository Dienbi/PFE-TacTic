<?php

namespace App\Services\FiscalProfile;

use App\Models\ChangeRequestDocument;
use App\Models\PersonalInfoChangeRequest;
use App\Models\Payslip;
use App\Models\Utilisateur;
use App\Services\FiscalProfile\DocumentRequirementService;
use App\Services\FiscalProfile\FiscalProfileAssignmentService;
use App\Services\FiscalProfile\HeadOfFamilyComputationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * PersonalInfoChangeRequestService
 * 
 * Single Responsibility: Manage the lifecycle of personal info change requests,
 * including submission, validation, approval, and rejection workflows.
 */
class PersonalInfoChangeRequestService
{
    private HeadOfFamilyComputationService $headOfFamilyComputation;
    private DocumentRequirementService $documentRequirementService;
    private FiscalProfileAssignmentService $assignmentService;

    public function __construct(
        HeadOfFamilyComputationService $headOfFamilyComputation,
        DocumentRequirementService $documentRequirementService,
        FiscalProfileAssignmentService $assignmentService
    ) {
        $this->headOfFamilyComputation = $headOfFamilyComputation;
        $this->documentRequirementService = $documentRequirementService;
        $this->assignmentService = $assignmentService;
    }

    /**
     * Submit a new personal info change request.
     *
     * @param array $data Request data
     * @param array $documents Document uploads
     * @return PersonalInfoChangeRequest
     * @throws \Exception If employee has an active request
     */
    public function submitRequest(array $data, array $documents): PersonalInfoChangeRequest
    {
        $employeeId = $data['employee_id'];
        
        // Check for active requests
        $hasActive = PersonalInfoChangeRequest::forEmployee($employeeId)
            ->active()
            ->exists();
        
        if ($hasActive) {
            throw new \Exception('Employee already has an active change request. Please wait for it to be processed.');
        }
        
        // Get employee data for head-of-family computation
        $employee = Utilisateur::find($employeeId);
        if (!$employee) {
            throw new \Exception('Employee not found');
        }
        
        // Compute head-of-family preview
        $headOfFamily = $this->headOfFamilyComputation->compute(
            $employee->gender ?? 'male',
            $data['requested_marital_status'] ?? $employee->marital_status ?? 'single',
            $data['requested_children_count'] ?? 0
        );
        
        DB::beginTransaction();
        try {
            // Create change request
            $request = PersonalInfoChangeRequest::create([
                'id' => (string) Str::uuid(),
                'employee_id' => $employeeId,
                'requested_marital_status' => $data['requested_marital_status'] ?? null,
                'requested_children_count' => $data['requested_children_count'] ?? null,
                'requested_disabled_children_count' => $data['requested_disabled_children_count'] ?? null,
                'requested_student_children_count' => $data['requested_student_children_count'] ?? null,
                'computed_head_of_family_preview' => $headOfFamily,
                'claimed_effective_date' => $data['claimed_effective_date'],
                'status' => 'pending',
                'submitted_at' => now(),
            ]);
            
            // Attach documents
            foreach ($documents as $docData) {
                ChangeRequestDocument::create([
                    'id' => (string) Str::uuid(),
                    'change_request_id' => $request->id,
                    'document_type' => $docData['type'],
                    'file_path' => $docData['path'],
                    'uploaded_at' => now(),
                    'verified_by_hr' => false,
                ]);
            }
            
            DB::commit();
            return $request->fresh(['documents']);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Approve a change request.
     *
     * @param string $requestId
     * @param string $reviewedBy
     * @return array
     * @throws \Exception If validation fails
     */
    public function approveRequest(string $requestId, string $reviewedBy): array
    {
        $request = PersonalInfoChangeRequest::with(['documents', 'employee'])->findOrFail($requestId);
        
        // Validate document requirements
        if (!$this->documentRequirementService->validateDocumentsPresent($request)) {
            throw new \Exception('Cannot approve: Required documents are missing');
        }
        
        if (!$this->documentRequirementService->validateDocumentsVerified($request)) {
            throw new \Exception('Cannot approve: All required documents must be verified by HR');
        }
        
        // Check for children decrease (always needs more info)
        if ($this->documentRequirementService->hasChildrenDecrease($request)) {
            $request->update([
                'status' => 'needs_more_info',
                'reviewed_by' => $reviewedBy,
                'reviewed_at' => now(),
            ]);
            return [
                'status' => 'needs_more_info',
                'message' => 'Request requires additional review due to children count decrease',
            ];
        }
        
        // Check for locked payslip conflict
        $affectsLocked = $this->checkLockedPayslipConflict(
            $request->employee_id,
            $request->claimed_effective_date
        );
        
        DB::beginTransaction();
        try {
            // Update request status
            $request->update([
                'status' => 'approved',
                'reviewed_by' => $reviewedBy,
                'reviewed_at' => now(),
                'affects_locked_payslips' => $affectsLocked,
            ]);
            
            // Create fiscal profile assignment
            $employee = $request->employee;
            $groupAttributes = [
                'gender' => $employee->gender ?? 'male',
                'marital_status' => $request->requested_marital_status ?? $employee->marital_status ?? 'single',
                'children_count' => $request->requested_children_count ?? 0,
                'disabled_children_count' => $request->requested_disabled_children_count ?? 0,
                'student_non_scholarship_children_count' => $request->requested_student_children_count ?? 0,
            ];
            
            $assignment = $this->assignmentService->assignProfile(
                $employeeId,
                $groupAttributes,
                $request->claimed_effective_date,
                $reviewedBy,
                $request->id
            );
            
            DB::commit();
            
            return [
                'status' => 'approved',
                'assignment_id' => $assignment->id,
                'affects_locked_payslips' => $affectsLocked,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Reject a change request.
     *
     * @param string $requestId
     * @param string $reviewedBy
     * @param string $notes
     * @return void
     */
    public function rejectRequest(string $requestId, string $reviewedBy, string $notes): void
    {
        $request = PersonalInfoChangeRequest::findOrFail($requestId);
        
        $request->update([
            'status' => 'rejected',
            'reviewed_by' => $reviewedBy,
            'reviewed_at' => now(),
            'review_notes' => $notes,
        ]);
    }

    /**
     * Check if the effective date conflicts with locked payslips.
     *
     * @param string $employeeId
     * @param string $effectiveDate
     * @return bool
     */
    public function checkLockedPayslipConflict(string $employeeId, string $effectiveDate): bool
    {
        // Get the pay period for the effective date
        $effectiveDateObj = \Carbon\Carbon::parse($effectiveDate);
        
        // Check if there's a locked payslip for this period
        $hasLockedPayslip = Payslip::where('employee_id', $employeeId)
            ->where('period_start', '<=', $effectiveDateObj)
            ->where('period_end', '>=', $effectiveDateObj)
            ->where('is_locked', true)
            ->exists();
        
        return $hasLockedPayslip;
    }

    /**
     * Get a change request by ID.
     *
     * @param string $requestId
     * @return PersonalInfoChangeRequest|null
     */
    public function getRequestById(string $requestId): ?PersonalInfoChangeRequest
    {
        return PersonalInfoChangeRequest::with(['employee', 'documents', 'reviewedBy'])->find($requestId);
    }

    /**
     * Get change requests by employee ID.
     *
     * @param int $employeeId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getByEmployee(int $employeeId)
    {
        return PersonalInfoChangeRequest::forEmployee($employeeId)
            ->with(['documents', 'reviewedBy'])
            ->orderBy('submitted_at', 'desc')
            ->get();
    }

    /**
     * Add a document to a change request.
     *
     * @param string $requestId
     * @param array $documentData
     * @return ChangeRequestDocument
     */
    public function addDocument(string $requestId, array $documentData): ChangeRequestDocument
    {
        return ChangeRequestDocument::create([
            'id' => (string) Str::uuid(),
            'change_request_id' => $requestId,
            'document_type' => $documentData['type'],
            'file_path' => $documentData['path'],
            'uploaded_at' => now(),
            'verified_by_hr' => false,
        ]);
    }

    /**
     * Verify a document.
     *
     * @param string $documentId
     * @param int $verifiedBy
     * @param string|null $notes
     * @return ChangeRequestDocument
     */
    public function verifyDocument(string $documentId, int $verifiedBy, ?string $notes = null): ChangeRequestDocument
    {
        $document = ChangeRequestDocument::findOrFail($documentId);
        $document->update([
            'verified_by_hr' => true,
            'verified_by' => $verifiedBy,
            'verification_notes' => $notes,
        ]);
        return $document->fresh();
    }

    /**
     * Get pending requests for HR review.
     *
     * @param int $page
     * @param int $perPage
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getPendingRequests(int $page = 1, int $perPage = 15)
    {
        return PersonalInfoChangeRequest::with(['employee', 'documents'])
            ->pending()
            ->orderBy('submitted_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Get requests by status.
     *
     * @param string $status
     * @param int $page
     * @param int $perPage
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getByStatus(string $status, int $page = 1, int $perPage = 15)
    {
        return PersonalInfoChangeRequest::with(['employee', 'documents', 'reviewedBy'])
            ->where('status', $status)
            ->orderBy('submitted_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);
    }
}
