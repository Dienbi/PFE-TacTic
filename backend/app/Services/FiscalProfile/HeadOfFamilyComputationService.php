<?php

namespace App\Services\FiscalProfile;

/**
 * HeadOfFamilyComputationService
 * 
 * Single Responsibility: Compute head-of-family status based on Tunisian fiscal rules.
 * This service isolates the business rule for easy modification when legal requirements change.
 * 
 * Current Rule (per spec - working assumption pending legal confirmation):
 * - Male: head_of_family = true if marital_status in (married, divorced, widowed)
 * - Female: head_of_family = true if marital_status in (divorced, widowed) AND children_count > 0
 * - Otherwise: head_of_family = false
 */
class HeadOfFamilyComputationService
{
    /**
     * Compute head-of-family status based on gender, marital status, and children count.
     *
     * @param string $gender 'male' or 'female'
     * @param string $maritalStatus 'single', 'married', 'divorced', or 'widowed'
     * @param int $childrenCount Number of children
     * @return bool True if head of family, false otherwise
     */
    public function compute(string $gender, string $maritalStatus, int $childrenCount): bool
    {
        // Normalize inputs
        $gender = strtolower($gender);
        $maritalStatus = strtolower($maritalStatus);
        
        // Rule for males
        if ($gender === 'male') {
            return in_array($maritalStatus, ['married', 'divorced', 'widowed']);
        }
        
        // Rule for females
        if ($gender === 'female') {
            // Only divorced or widowed females with children qualify
            if (in_array($maritalStatus, ['divorced', 'widowed']) && $childrenCount > 0) {
                return true;
            }
        }
        
        // Default: not head of family
        return false;
    }

    /**
     * Compute head-of-family status from an employee data array.
     * Convenience method for use with employee records.
     *
     * @param array $employeeData Must contain 'gender', 'marital_status', 'children_count'
     * @return bool
     */
    public function computeFromEmployeeData(array $employeeData): bool
    {
        return $this->compute(
            $employeeData['gender'] ?? 'male',
            $employeeData['marital_status'] ?? 'single',
            $employeeData['children_count'] ?? 0
        );
    }
}
