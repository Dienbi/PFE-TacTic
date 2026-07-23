<?php

namespace App\Services\FiscalProfile;

use App\Models\PersonalInfoChangeRequest;

/**
 * DocumentRequirementService
 * 
 * Single Responsibility: Determine required document types based on change request details.
 * Implements the dynamic document requirement rules from the spec.
 */
class DocumentRequirementService
{
    /**
     * Get required document types for a given set of changes.
     *
     * @param array $changes Contains keys: 'old_marital_status', 'new_marital_status', 
     *                       'old_children_count', 'new_children_count', etc.
     * @return array Array of required document type strings
     */
    public function getRequiredDocumentTypes(array $changes): array
    {
        $required = [];
        
        // Marital status changes
        if (isset($changes['old_marital_status']) && isset($changes['new_marital_status'])) {
            $old = strtolower($changes['old_marital_status']);
            $new = strtolower($changes['new_marital_status']);
            
            if ($old === 'single' && $new === 'married') {
                $required[] = 'marriage_certificate';
            } elseif ($old === 'married' && $new === 'divorced') {
                $required[] = 'divorce_judgment';
            } elseif ($old === 'married' && $new === 'widowed') {
                $required[] = 'death_certificate';
            }
        }
        
        // Children count increases
        if (isset($changes['old_children_count']) && isset($changes['new_children_count'])) {
            $increase = $changes['new_children_count'] - $changes['old_children_count'];
            if ($increase > 0) {
                // One birth certificate per new child
                for ($i = 0; $i < $increase; $i++) {
                    $required[] = 'birth_certificate';
                }
            }
        }
        
        // Disabled children claim
        if (isset($changes['new_disabled_children_count']) && $changes['new_disabled_children_count'] > 0) {
            $required[] = 'disability_certificate';
        }
        
        // Student non-scholarship children claim
        if (isset($changes['new_student_children_count']) && $changes['new_student_children_count'] > 0) {
            $required[] = 'school_enrollment_certificate';
        }
        
        return array_unique($required);
    }

    /**
     * Validate that all required documents are present for a change request.
     *
     * @param PersonalInfoChangeRequest $request
     * @return bool True if all required documents are present
     */
    public function validateDocumentsPresent(PersonalInfoChangeRequest $request): bool
    {
        // Determine what changed
        $changes = $this->determineChanges($request);
        $requiredTypes = $this->getRequiredDocumentTypes($changes);
        
        if (empty($requiredTypes)) {
            return true;
        }
        
        // Count present documents by type
        $presentTypes = $request->documents->pluck('document_type')->toArray();
        
        // Check if all required types are present
        foreach ($requiredTypes as $type) {
            if (!in_array($type, $presentTypes)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Validate that all required documents are verified by HR.
     *
     * @param PersonalInfoChangeRequest $request
     * @return bool True if all required documents are verified
     */
    public function validateDocumentsVerified(PersonalInfoChangeRequest $request): bool
    {
        // Determine what changed
        $changes = $this->determineChanges($request);
        $requiredTypes = $this->getRequiredDocumentTypes($changes);
        
        if (empty($requiredTypes)) {
            return true;
        }
        
        // Check verification status for each required type
        foreach ($requiredTypes as $type) {
            $documents = $request->documents->where('document_type', $type);
            $allVerified = $documents->every(function ($doc) {
                return $doc->verified_by_hr === true;
            });
            
            if (!$allVerified) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check if the request involves a decrease in any children count.
     * This always requires manual review (needs_more_info status).
     *
     * @param PersonalInfoChangeRequest $request
     * @return bool True if any children count decreased
     */
    public function hasChildrenDecrease(PersonalInfoChangeRequest $request): bool
    {
        // Get current employee data
        $employee = $request->employee;
        if (!$employee) {
            return false;
        }
        
        // Check for decreases
        if ($request->requested_children_count !== null) {
            // We'd need to know the current value - this is a simplified check
            // In practice, you'd fetch the current fiscal profile assignment
            return false; // Placeholder - implement with actual current data
        }
        
        return false;
    }

    /**
     * Determine what changed between current state and requested state.
     *
     * @param PersonalInfoChangeRequest $request
     * @return array
     */
    private function determineChanges(PersonalInfoChangeRequest $request): array
    {
        // Get current employee data from their active fiscal profile
        $currentAssignment = $request->employee
            ? $request->employee->fiscalProfileAssignments()
                ->whereNull('effective_to')
                ->first()
            : null;
        
        $currentProfile = $currentAssignment ? $currentAssignment->fiscalProfileGroup : null;
        
        return [
            'old_marital_status' => $currentProfile ? $currentProfile->marital_status : null,
            'new_marital_status' => $request->requested_marital_status,
            'old_children_count' => $currentProfile ? $currentProfile->children_count : 0,
            'new_children_count' => $request->requested_children_count,
            'new_disabled_children_count' => $request->requested_disabled_children_count,
            'new_student_children_count' => $request->requested_student_children_count,
        ];
    }
}
