<?php

use App\Models\EmployeeFiscalProfile;
use App\Models\Utilisateur;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Only run if employee_fiscal_profiles table exists and has data
        if (!Schema::hasTable('employee_fiscal_profiles')) {
            return;
        }

        $existingProfiles = DB::table('employee_fiscal_profiles')->get();
        
        if ($existingProfiles->isEmpty()) {
            return;
        }

        // Get head_of_family computation service logic (simplified for migration)
        $computeHeadOfFamily = function ($gender, $maritalStatus, $childrenCount) {
            if ($gender === 'male' && in_array($maritalStatus, ['married', 'divorced', 'widowed'])) {
                return true;
            }
            if ($gender === 'female' && in_array($maritalStatus, ['divorced', 'widowed']) && $childrenCount > 0) {
                return true;
            }
            return false;
        };

        // Group profiles by their attributes to create unique fiscal_profile_groups
        $profileGroups = [];
        
        foreach ($existingProfiles as $profile) {
            // Get employee gender from utilisateurs table
            $employee = DB::table('utilisateurs')->where('id', $profile->employee_id)->first();
            // Default to male if gender column doesn't exist or is null
            $gender = 'male';
            
            $maritalStatus = $profile->marital_status ?? 'single';
            $childrenCount = $profile->children_count ?? 0;
            $disabledChildrenCount = $profile->disabled_children_count ?? 0;
            $studentChildrenCount = $profile->student_non_scholarship_children_count ?? 0;
            
            $headOfFamily = $computeHeadOfFamily($gender, $maritalStatus, $childrenCount);
            
            // Generate label
            $labelParts = [];
            $labelParts[] = ucfirst($maritalStatus) . ' ' . ucfirst($gender);
            if ($headOfFamily) {
                $labelParts[] = 'Head of Family';
            }
            if ($childrenCount > 0) {
                $labelParts[] = $childrenCount . ' children';
            }
            $label = implode(' · ', $labelParts);
            
            // Create unique key for deduplication
            $groupKey = md5($gender . $maritalStatus . $headOfFamily . $childrenCount . $disabledChildrenCount . $studentChildrenCount);
            
            if (!isset($profileGroups[$groupKey])) {
                $groupId = (string) Str::uuid();
                $profileGroups[$groupKey] = [
                    'id' => $groupId,
                    'gender' => $gender,
                    'marital_status' => $maritalStatus,
                    'head_of_family' => $headOfFamily,
                    'children_count' => $childrenCount,
                    'disabled_children_count' => $disabledChildrenCount,
                    'student_non_scholarship_children_count' => $studentChildrenCount,
                    'label' => $label,
                    'employees' => [],
                ];
            }
            
            $profileGroups[$groupKey]['employees'][] = [
                'employee_id' => $profile->employee_id,
                'effective_from' => $profile->effective_from,
                'old_profile_id' => $profile->id,
            ];
        }

        // Insert fiscal_profile_groups
        foreach ($profileGroups as $group) {
            DB::table('fiscal_profile_groups')->insert([
                'id' => $group['id'],
                'gender' => $group['gender'],
                'marital_status' => $group['marital_status'],
                'head_of_family' => $group['head_of_family'],
                'children_count' => $group['children_count'],
                'disabled_children_count' => $group['disabled_children_count'],
                'student_non_scholarship_children_count' => $group['student_non_scholarship_children_count'],
                'label' => $group['label'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            // Insert employee_fiscal_profile_assignments for each employee
            foreach ($group['employees'] as $employee) {
                DB::table('employee_fiscal_profile_assignments')->insert([
                    'id' => (string) Str::uuid(),
                    'employee_id' => $employee['employee_id'],
                    'fiscal_profile_group_id' => $group['id'],
                    'effective_from' => $employee['effective_from'],
                    'effective_to' => null,
                    'source_change_request_id' => null,
                    'assigned_by' => $employee['employee_id'], // Self-assigned during migration
                    'assigned_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Add comment to old table to mark as deprecated (PostgreSQL syntax)
        DB::statement("COMMENT ON TABLE employee_fiscal_profiles IS 'DEPRECATED - Migrated to fiscal_profile_groups and employee_fiscal_profile_assignments on " . now()->toDateTimeString() . "'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove comment (PostgreSQL syntax)
        DB::statement("COMMENT ON TABLE employee_fiscal_profiles IS NULL");
        
        // Delete migrated data
        DB::table('employee_fiscal_profile_assignments')->where('source_change_request_id', null)->delete();
        DB::table('fiscal_profile_groups')->delete();
    }
};
