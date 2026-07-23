<?php

namespace App\Services\FiscalProfile;

use App\Models\FiscalProfileGroup;
use App\Models\Utilisateur;
use Illuminate\Support\Str;

/**
 * FiscalProfileGroupService
 * 
 * Single Responsibility: Manage fiscal profile group lifecycle including creation,
 * deduplication, and label generation.
 */
class FiscalProfileGroupService
{
    private HeadOfFamilyComputationService $headOfFamilyComputation;

    public function __construct(HeadOfFamilyComputationService $headOfFamilyComputation)
    {
        $this->headOfFamilyComputation = $headOfFamilyComputation;
    }

    /**
     * Find or create a fiscal profile group based on attributes.
     * Implements deduplication logic to prevent duplicate groups.
     *
     * @param array $attributes ['gender', 'marital_status', 'children_count', 
     *                          'disabled_children_count', 'student_non_scholarship_children_count']
     * @return FiscalProfileGroup
     */
    public function findOrCreate(array $attributes): FiscalProfileGroup
    {
        // Check for existing group with same attributes
        $existing = $this->deduplicationCheck($attributes);
        
        if ($existing) {
            return $existing;
        }
        
        // Compute head_of_family
        $headOfFamily = $this->headOfFamilyComputation->compute(
            $attributes['gender'],
            $attributes['marital_status'],
            $attributes['children_count'] ?? 0
        );
        
        // Generate label
        $label = $this->generateLabel([
            'gender' => $attributes['gender'],
            'marital_status' => $attributes['marital_status'],
            'head_of_family' => $headOfFamily,
            'children_count' => $attributes['children_count'] ?? 0,
        ]);
        
        // Create new group
        return FiscalProfileGroup::create([
            'id' => (string) Str::uuid(),
            'gender' => $attributes['gender'],
            'marital_status' => $attributes['marital_status'],
            'head_of_family' => $headOfFamily,
            'children_count' => $attributes['children_count'] ?? 0,
            'disabled_children_count' => $attributes['disabled_children_count'] ?? 0,
            'student_non_scholarship_children_count' => $attributes['student_non_scholarship_children_count'] ?? 0,
            'label' => $label,
        ]);
    }

    /**
     * Check if a fiscal profile group with the given attributes already exists.
     *
     * @param array $attributes
     * @return FiscalProfileGroup|null
     */
    public function deduplicationCheck(array $attributes): ?FiscalProfileGroup
    {
        return FiscalProfileGroup::where('gender', $attributes['gender'])
            ->where('marital_status', $attributes['marital_status'])
            ->where('children_count', $attributes['children_count'] ?? 0)
            ->where('disabled_children_count', $attributes['disabled_children_count'] ?? 0)
            ->where('student_non_scholarship_children_count', $attributes['student_non_scholarship_children_count'] ?? 0)
            ->first();
    }

    /**
     * Generate a human-readable label for a fiscal profile group.
     *
     * @param array $attributes
     * @return string
     */
    public function generateLabel(array $attributes): string
    {
        $parts = [];
        
        // Marital status and gender
        $parts[] = ucfirst($attributes['marital_status']) . ' ' . ucfirst($attributes['gender']);
        
        // Head of family indicator
        if ($attributes['head_of_family'] ?? false) {
            $parts[] = 'Head of Family';
        }
        
        // Children count
        if (($attributes['children_count'] ?? 0) > 0) {
            $parts[] = $attributes['children_count'] . ' children';
        }
        
        // Disabled children
        if (($attributes['disabled_children_count'] ?? 0) > 0) {
            $parts[] .= $attributes['disabled_children_count'] . ' disabled';
        }
        
        // Student children
        if (($attributes['student_non_scholarship_children_count'] ?? 0) > 0) {
            $parts[] .= $attributes['student_non_scholarship_children_count'] . ' student';
        }
        
        return implode(' · ', $parts);
    }

    /**
     * Get all fiscal profile groups.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getAll()
    {
        return FiscalProfileGroup::orderBy('label')->get();
    }

    /**
     * Get a fiscal profile group by ID.
     *
     * @param string $id
     * @return FiscalProfileGroup|null
     */
    public function findById(string $id): ?FiscalProfileGroup
    {
        return FiscalProfileGroup::find($id);
    }

    /**
     * Get employees currently assigned to a fiscal profile group.
     *
     * @param string $groupId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getEmployees(string $groupId)
    {
        $group = $this->findById($groupId);
        if (!$group) {
            return collect();
        }
        
        return $group->employees()->whereNull('employee_fiscal_profile_assignments.effective_to')->get();
    }

    /**
     * Search fiscal profile groups by label/name.
     *
     * @param string $label
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function searchByLabel(string $label)
    {
        return FiscalProfileGroup::where('label', 'ilike', '%' . $label . '%')
            ->orderBy('label')
            ->get();
    }
}
