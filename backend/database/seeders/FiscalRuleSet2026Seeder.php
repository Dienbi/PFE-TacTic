<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FiscalRuleSet2026Seeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create fiscal rule set for 2026
        $ruleSetId = Str::uuid();
        
        DB::table('fiscal_rule_sets')->insert([
            'id' => $ruleSetId,
            'year' => 2026,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
            'status' => 'confirmed',
            'cnss_employee_rate' => 0.0968,
            'cnss_employer_rate' => 0.1707,
            'cnss_monthly_ceiling' => null,
            'css_rate' => 0.005,
            'css_exempt_annual_net_threshold' => 5000.000,
            'prof_expense_rate' => 0.10,
            'prof_expense_annual_cap' => 2000.000,
            'min_annual_tax' => 45.000,
            'source_pdf_ref' => null,
            'confirmed_by' => null,
            'confirmed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        // Create IRPP brackets (8 brackets as per 2026 spec)
        $brackets = [
            ['order' => 1, 'min' => 0, 'max' => 5000, 'rate' => 0.00],
            ['order' => 2, 'min' => 5000, 'max' => 10000, 'rate' => 0.15],
            ['order' => 3, 'min' => 10000, 'max' => 20000, 'rate' => 0.25],
            ['order' => 4, 'min' => 20000, 'max' => 30000, 'rate' => 0.30],
            ['order' => 5, 'min' => 30000, 'max' => 40000, 'rate' => 0.33],
            ['order' => 6, 'min' => 40000, 'max' => 50000, 'rate' => 0.36],
            ['order' => 7, 'min' => 50000, 'max' => 70000, 'rate' => 0.38],
            ['order' => 8, 'min' => 70000, 'max' => null, 'rate' => 0.40],
        ];
        
        foreach ($brackets as $bracket) {
            DB::table('irpp_brackets')->insert([
                'id' => Str::uuid(),
                'rule_set_id' => $ruleSetId,
                'bracket_order' => $bracket['order'],
                'min_annual_amount' => $bracket['min'],
                'max_annual_amount' => $bracket['max'],
                'rate' => $bracket['rate'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        
        // Create family deduction rules
        $familyDeductions = [
            ['type' => 'head_of_household', 'amount' => 300.000, 'max_count' => null],
            ['type' => 'child', 'amount' => 100.000, 'max_count' => 4],
            ['type' => 'disabled_child', 'amount' => 2000.000, 'max_count' => null],
            ['type' => 'student_child_non_scholarship', 'amount' => 1000.000, 'max_count' => null],
        ];
        
        foreach ($familyDeductions as $deduction) {
            DB::table('family_deduction_rules')->insert([
                'id' => Str::uuid(),
                'rule_set_id' => $ruleSetId,
                'deduction_type' => $deduction['type'],
                'annual_amount' => $deduction['amount'],
                'max_count' => $deduction['max_count'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        
        $this->command->info('2026 Fiscal Rule Set seeded successfully with IRPP brackets and family deductions.');
    }
}
