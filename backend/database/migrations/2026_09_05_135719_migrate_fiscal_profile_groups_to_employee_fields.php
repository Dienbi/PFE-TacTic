<?php

use App\Models\Utilisateur;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get all employees and set default fiscal values
        $employees = Utilisateur::all();

        foreach ($employees as $employee) {
            // Compute head_of_family inline (logic from deleted HeadOfFamilyComputationService)
            $gender = $employee->gender ?? 'male';
            $maritalStatus = $employee->marital_status ?? 'single';
            $childrenCount = $employee->children_count ?? 0;
            
            // Head of family logic: male married with children, or female married with disabled children
            $headOfFamily = ($gender === 'male' && $maritalStatus === 'married' && $childrenCount > 0) ||
                           ($gender === 'female' && $maritalStatus === 'married' && $employee->disabled_children_count > 0);

            // Set default fiscal values
            $employee->disabled_children_count = 0;
            $employee->student_non_scholarship_children_count = 0;
            $employee->head_of_family = $headOfFamily;
            $employee->save();

            // Validate marital_status before inserting
            $validMaritalStatuses = ['single', 'married', 'divorced', 'widowed'];
            $maritalStatus = in_array($employee->marital_status, $validMaritalStatuses) 
                ? $employee->marital_status 
                : 'single';

            // Create initial fiscal status history entry
            DB::table('employee_fiscal_status_history')->insert([
                'id' => (string) Str::uuid(),
                'employee_id' => $employee->id,
                'marital_status' => $maritalStatus,
                'children_count' => $employee->children_count ?? 0,
                'disabled_children_count' => 0,
                'student_non_scholarship_children_count' => 0,
                'head_of_family' => $employee->head_of_family,
                'effective_from' => $employee->date_embauche ?? now()->toDateString(),
                'effective_to' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is data-only and cannot be easily reversed
        // In production, you would restore from backup
        // For development, we can clear the migrated fields
        Utilisateur::query()->update([
            'disabled_children_count' => 0,
            'student_non_scholarship_children_count' => 0,
            'head_of_family' => false,
            'role_profile_id' => null,
        ]);

        DB::table('employee_fiscal_status_history')->truncate();
    }
};
