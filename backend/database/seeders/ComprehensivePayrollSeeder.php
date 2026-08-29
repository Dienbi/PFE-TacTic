<?php

namespace Database\Seeders;

use App\Models\Utilisateur;
use App\Models\Child;
use App\Models\SocialStatusProof;
use App\Models\EmployeeFiscalProfile;
use App\Models\FiscalProfileGroup;
use App\Models\Payslip;
use App\Models\Payment;
use App\Models\FiscalRuleSet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ComprehensivePayrollSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🔧 Starting ComprehensivePayrollSeeder...');

        // ────────────────────────────────────────────────────────────
        // 1. Update utilisateurs with complete social status
        // ────────────────────────────────────────────────────────────
        $this->command->info('👤 Updating social status for all employees...');
        $this->updateSocialStatus();

        // ────────────────────────────────────────────────────────────
        // 2. Create Child records
        // ────────────────────────────────────────────────────────────
        $this->command->info('👶 Creating child records...');
        $this->createChildRecords();

        // ────────────────────────────────────────────────────────────
        // 3. Create SocialStatusProof records
        // ────────────────────────────────────────────────────────────
        $this->command->info('📄 Creating social status proof records...');
        $this->createSocialStatusProofs();

        // ────────────────────────────────────────────────────────────
        // 4. Create EmployeeFiscalProfile records
        // ────────────────────────────────────────────────────────────
        $this->command->info('💼 Creating employee fiscal profiles...');
        $this->createEmployeeFiscalProfiles();

        // ────────────────────────────────────────────────────────────
        // 5. Clear and recreate FiscalProfileGroup records
        // ────────────────────────────────────────────────────────────
        $this->command->info('📊 Creating fiscal profile groups...');
        DB::table('employee_fiscal_profile_assignments')->truncate();
        FiscalProfileGroup::query()->delete();
        $this->createFiscalProfileGroups();

        // ────────────────────────────────────────────────────────────
        // 6. Assign employees to fiscal profile groups
        // ────────────────────────────────────────────────────────────
        $this->command->info('🔗 Assigning employees to fiscal profile groups...');
        $this->assignEmployeesToFiscalProfileGroups();

        // ────────────────────────────────────────────────────────────
        // 7. Generate 12 months of Payslip records for 2025
        // ────────────────────────────────────────────────────────────
        $this->command->info('💰 Generating payslips for 2025...');
        $this->generatePayslips();

        // ────────────────────────────────────────────────────────────
        // 8. Create Payment records
        // ────────────────────────────────────────────────────────────
        $this->command->info('💳 Creating payment records...');
        $this->createPayments();

        // ────────────────────────────────────────────────────────────
        // 9. Create year-end regularization payslips
        // ────────────────────────────────────────────────────────────
        $this->command->info('🔄 Creating year-end regularization payslips...');
        $this->createRegularizationPayslips();

        $this->command->info('✅ ComprehensivePayrollSeeder completed!');
    }

    private function updateSocialStatus(): void
    {
        $users = Utilisateur::all();

        foreach ($users as $user) {
            // Ensure gender is set
            if (!$user->gender) {
                $user->gender = $this->determineGenderFromName($user->prenom);
            }

            // Assign marital status with realistic distribution
            if (!$user->marital_status) {
                $random = rand(1, 100);
                if ($random <= 40) {
                    $user->marital_status = 'single';
                } elseif ($random <= 80) {
                    $user->marital_status = 'married';
                } elseif ($random <= 90) {
                    $user->marital_status = 'divorced';
                } else {
                    $user->marital_status = 'widowed';
                }
            }

            // Assign children count based on marital status
            // Force re-assignment for non-single employees to ensure distribution
            if ($user->marital_status === 'single') {
                $user->children_count = 0;
            } else {
                // Married/divorced/widowed: random 0-4 children
                $weights = [30, 25, 20, 15, 10]; // 0, 1, 2, 3, 4 children
                $random = rand(1, 100);
                $cumulative = 0;
                $childrenCount = 0;
                
                foreach ($weights as $count => $weight) {
                    $cumulative += $weight;
                    if ($random <= $cumulative) {
                        $childrenCount = $count;
                        break;
                    }
                }
                $user->children_count = $childrenCount;
            }

            $user->save();
        }

        $this->command->info("  ✓ Updated {$users->count()} employees with social status");
    }

    private function determineGenderFromName(string $firstName): string
    {
        $maleNames = ['Mohamed', 'Ahmed', 'Ali', 'Hamza', 'Omar', 'Khalil', 'Youssef', 'Karim', 'Sami', 'Rami',
            'Amine', 'Bilel', 'Fares', 'Wael', 'Mehdi', 'Wassim', 'Hatem', 'Sofiane', 'Riadh', 'Nabil',
            'Aymen', 'Anis', 'Bassel', 'Chadi', 'Dhia', 'Elyes', 'Ghazi', 'Hichem', 'Iheb', 'Jasser',
            'Kais', 'Lotfi', 'Mahdi', 'Oussama', 'Qais', 'Tarek', 'Walid', 'Yassine', 'Zied', 'Abdel',
            'Abdul', 'Adel', 'Amin', 'Aziz', 'Bassem', 'Chokri'];

        $femaleNames = ['Sara', 'Fatma', 'Mariem', 'Hiba', 'Nour', 'Ines', 'Rim', 'Nesrine', 'Olfa', 'Rahma',
            'Sana', 'Manel', 'Asma', 'Amel', 'Leila', 'Khadija', 'Amina', 'Samira', 'Nadia', 'Faten',
            'Chaima', 'Sirine', 'Emna', 'Houda', 'Ikram', 'Jihene', 'Kawthar', 'Lina', 'Maha', 'Noura',
            'Rania', 'Salma', 'Tasnim', 'Wafa', 'Yasmine', 'Zahra', 'Aya', 'Dorra', 'Ghada', 'Hana'];

        $firstName = ucfirst(strtolower($firstName));

        if (in_array($firstName, $maleNames)) {
            return 'male';
        }
        if (in_array($firstName, $femaleNames)) {
            return 'female';
        }

        return rand(1, 2) === 1 ? 'male' : 'female';
    }

    private function createChildRecords(): void
    {
        $users = Utilisateur::where('children_count', '>', 0)->get();
        $maleFirstNames = ['Ahmed', 'Mohamed', 'Youssef', 'Omar', 'Khalil', 'Karim', 'Sami', 'Amine', 'Bilel', 'Fares'];
        $femaleFirstNames = ['Sara', 'Fatma', 'Mariem', 'Hiba', 'Nour', 'Ines', 'Rim', 'Nesrine', 'Olfa', 'Rahma'];
        $lastNames = ['Ben Ali', 'Trabelsi', 'Bouazizi', 'Gharbi', 'Hamdi', 'Jebali', 'Khelifi', 'Mansouri'];

        foreach ($users as $user) {
            for ($i = 0; $i < $user->children_count; $i++) {
                $isMale = rand(1, 2) === 1;
                $firstName = $isMale ? $maleFirstNames[array_rand($maleFirstNames)] : $femaleFirstNames[array_rand($femaleFirstNames)];
                $lastName = $lastNames[array_rand($lastNames)];
                
                // Determine child status
                $statusRandom = rand(1, 100);
                if ($statusRandom <= 70) {
                    $status = 'healthy';
                } elseif ($statusRandom <= 85) {
                    $status = 'disabled';
                } else {
                    $status = 'university';
                }

                // Calculate birth date based on status
                $yearsAgo = $status === 'university' ? rand(18, 25) : rand(1, 17);
                $birthDate = Carbon::now()->subYears($yearsAgo);

                Child::create([
                    'utilisateur_id' => $user->id,
                    'nom' => $lastName,
                    'prenom' => $firstName,
                    'date_naissance' => $birthDate,
                    'status' => $status,
                    'document_path' => null,
                    'verified' => rand(1, 10) > 3, // 70% verified
                    'verified_at' => rand(1, 10) > 3 ? Carbon::now()->subDays(rand(1, 365)) : null,
                    'rejected' => false,
                    'rejected_at' => null,
                    'rejection_reason' => null,
                ]);
            }
        }

        $totalChildren = Child::count();
        $this->command->info("  ✓ Created {$totalChildren} child records");
    }

    private function createSocialStatusProofs(): void
    {
        $users = Utilisateur::whereIn('marital_status', ['married', 'divorced', 'widowed'])->get();

        foreach ($users as $user) {
            SocialStatusProof::create([
                'utilisateur_id' => $user->id,
                'social_status' => $user->marital_status,
                'document_path' => 'documents/social_status_proofs/' . Str::uuid() . '.pdf',
                'verified' => rand(1, 10) > 4, // 60% verified
                'verified_at' => rand(1, 10) > 4 ? Carbon::now()->subDays(rand(1, 365)) : null,
                'status' => rand(1, 10) > 4 ? 'verified' : 'pending',
                'rejection_reason' => null,
            ]);
        }

        $totalProofs = SocialStatusProof::count();
        $this->command->info("  ✓ Created {$totalProofs} social status proof records");
    }

    private function createEmployeeFiscalProfiles(): void
    {
        $users = Utilisateur::all();

        foreach ($users as $user) {
            // Get children details
            $children = Child::where('utilisateur_id', $user->id)->get();
            $disabledCount = $children->where('status', 'disabled')->count();
            $studentCount = $children->where('status', 'university')->count();

            // Map marital status to fiscal profile status (only 'single' or 'head_of_household' allowed)
            $fiscalMaritalStatus = 'single';
            if (($user->marital_status === 'married' || $user->marital_status === 'widowed') && $user->gender === 'male') {
                $fiscalMaritalStatus = 'head_of_household';
            }

            EmployeeFiscalProfile::updateOrCreate(
                [
                    'employee_id' => $user->id,
                    'effective_from' => $user->date_embauche ?? Carbon::now()->subYears(2),
                ],
                [
                    'id' => Str::uuid(),
                    'marital_status' => $fiscalMaritalStatus,
                    'children_count' => $user->children_count,
                    'disabled_children_count' => $disabledCount,
                    'student_non_scholarship_children_count' => $studentCount,
                ]
            );
        }

        $totalProfiles = EmployeeFiscalProfile::count();
        $this->command->info("  ✓ Created {$totalProfiles} employee fiscal profiles");
    }

    private function createFiscalProfileGroups(): void
    {
        $genders = ['male', 'female'];
        $maritalStatuses = ['single', 'married', 'divorced', 'widowed'];
        $childrenCounts = [0, 1, 2, 3, 4];

        foreach ($genders as $gender) {
            foreach ($maritalStatuses as $maritalStatus) {
                foreach ($childrenCounts as $childrenCount) {
                    // Skip invalid combinations (single with children)
                    if ($maritalStatus === 'single' && $childrenCount > 0) {
                        continue;
                    }

                    $label = $this->generateFiscalProfileLabel($gender, $maritalStatus, $childrenCount);
                    $headOfFamily = ($maritalStatus === 'married' || $maritalStatus === 'widowed') && $gender === 'male';

                    FiscalProfileGroup::updateOrCreate(
                        [
                            'gender' => $gender,
                            'marital_status' => $maritalStatus,
                            'head_of_family' => $headOfFamily,
                            'children_count' => $childrenCount,
                        ],
                        [
                            'id' => Str::uuid(),
                            'disabled_children_count' => 0,
                            'student_non_scholarship_children_count' => 0,
                            'label' => $label,
                        ]
                    );
                }
            }
        }

        $totalGroups = FiscalProfileGroup::count();
        $this->command->info("  ✓ Created {$totalGroups} fiscal profile groups");
    }

    private function generateFiscalProfileLabel(string $gender, string $maritalStatus, int $childrenCount): string
    {
        $genderLabel = $gender === 'male' ? 'Male' : 'Female';
        $statusLabels = [
            'single' => 'Single',
            'married' => 'Married',
            'divorced' => 'Divorced',
            'widowed' => 'Widowed',
        ];

        $label = "{$genderLabel} - {$statusLabels[$maritalStatus]}";
        if ($childrenCount > 0) {
            $label .= " - {$childrenCount} child(ren)";
        }

        return $label;
    }

    private function assignEmployeesToFiscalProfileGroups(): void
    {
        $users = Utilisateur::all();
        $rhUser = Utilisateur::where('role', 'RH')->first();
        $assignedBy = $rhUser ? $rhUser->id : $users->first()->id;

        foreach ($users as $user) {
            // Determine head_of_family status
            $headOfFamily = ($user->marital_status === 'married' || $user->marital_status === 'widowed') && $user->gender === 'male';

            $group = FiscalProfileGroup::where('gender', $user->gender)
                ->where('marital_status', $user->marital_status)
                ->where('head_of_family', $headOfFamily)
                ->where('children_count', $user->children_count)
                ->first();

            if ($group) {
                DB::table('employee_fiscal_profile_assignments')->updateOrInsert(
                    [
                        'employee_id' => $user->id,
                        'fiscal_profile_group_id' => $group->id,
                    ],
                    [
                        'id' => Str::uuid(),
                        'effective_from' => $user->date_embauche ?? Carbon::now()->subYears(2),
                        'assigned_by' => $assignedBy,
                        'assigned_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }

        $totalAssignments = DB::table('employee_fiscal_profile_assignments')->count();
        $this->command->info("  ✓ Assigned {$totalAssignments} employees to fiscal profile groups");
    }

    private function generatePayslips(): void
    {
        $users = Utilisateur::where('actif', true)->get();
        $ruleSet = FiscalRuleSet::where('year', 2026)->first();
        
        if (!$ruleSet) {
            $this->command->warn('  ⚠ No 2026 fiscal rule set found, skipping payslip generation');
            return;
        }

        $rhUser = Utilisateur::where('role', 'RH')->first();
        $generatedBy = $rhUser ? $rhUser->id : $users->first()->id;

        $payslipBatch = [];
        $batchSize = 100;

        // Generate 12 months of payslips for 2025
        for ($month = 1; $month <= 12; $month++) {
            $periodStart = Carbon::create(2025, $month, 1)->startOfMonth();
            $periodEnd = Carbon::create(2025, $month, 1)->endOfMonth();

            foreach ($users as $user) {
                // Skip if payslip already exists for this period
                $existing = Payslip::where('employee_id', $user->id)
                    ->where('pay_period_start', $periodStart->toDateString())
                    ->where('pay_period_end', $periodEnd->toDateString())
                    ->first();

                if ($existing) {
                    continue;
                }

                // Calculate payslip amounts
                $baseSalary = (float) $user->salaire_base;
                $overtimeHours = rand(0, 20);
                $overtimeAmount = $overtimeHours * ($baseSalary / 173) * 1.25;
                $grossSalary = $baseSalary + $overtimeAmount;

                // CNSS calculation (9.68%)
                $cnssEmployeeAmount = $grossSalary * 0.0968;
                $cnssEmployerAmount = $grossSalary * 0.1707;

                // Taxable base
                $taxableBaseMonthly = $grossSalary - $cnssEmployeeAmount;
                $taxableBaseAnnual = $taxableBaseMonthly * 12;

                // IRPP calculation (simplified)
                $irppAnnual = $this->calculateIRPP($taxableBaseAnnual);
                $irppMonthly = $irppAnnual / 12;

                // CSS calculation (0.5%)
                $cssAmount = $taxableBaseMonthly * 0.005;

                // Family deductions
                $fiscalProfile = EmployeeFiscalProfile::where('employee_id', $user->id)->first();
                $familyDeduction = 0;
                if ($fiscalProfile) {
                    if ($fiscalProfile->marital_status === 'married' && $user->gender === 'male') {
                        $familyDeduction += 300; // Head of household
                    }
                    $familyDeduction += min($fiscalProfile->children_count, 4) * 100; // Children
                    $familyDeduction += $fiscalProfile->disabled_children_count * 2000; // Disabled children
                    $familyDeduction += $fiscalProfile->student_non_scholarship_children_count * 1000; // Student children
                }

                // Apply family deduction to tax
                $irppAnnual = max(0, $irppAnnual - $familyDeduction);
                $irppMonthly = $irppAnnual / 12;

                $netSalary = $grossSalary - $cnssEmployeeAmount - $irppMonthly - $cssAmount;

                $payslipBatch[] = [
                    'id' => Str::uuid(),
                    'employee_id' => $user->id,
                    'pay_period_start' => $periodStart->toDateString(),
                    'pay_period_end' => $periodEnd->toDateString(),
                    'rule_set_id' => $ruleSet->id,
                    'base_salary_used' => $baseSalary,
                    'gross_salary' => $grossSalary,
                    'cnss_employee_amount' => $cnssEmployeeAmount,
                    'cnss_employer_amount' => $cnssEmployerAmount,
                    'taxable_base_annual' => $taxableBaseAnnual,
                    'irpp_annual' => $irppAnnual,
                    'irpp_monthly' => $irppMonthly,
                    'css_amount' => $cssAmount,
                    'net_salary' => $netSalary,
                    'status' => 'validated',
                    'version' => 1,
                    'supersedes_payslip_id' => null,
                    'is_regularization_adjustment' => false,
                    'generated_at' => $periodEnd->addDays(5),
                    'generated_by' => $generatedBy,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (count($payslipBatch) >= $batchSize) {
                    DB::table('payslips')->insert($payslipBatch);
                    $payslipBatch = [];
                }
            }
        }

        // Insert remaining
        if (!empty($payslipBatch)) {
            DB::table('payslips')->insert($payslipBatch);
        }

        $totalPayslips = Payslip::count();
        $this->command->info("  ✓ Generated {$totalPayslips} payslip records");
    }

    private function calculateIRPP(float $annualTaxable): float
    {
        // 2026 IRPP brackets
        $brackets = [
            ['min' => 0, 'max' => 5000, 'rate' => 0.00],
            ['min' => 5000, 'max' => 10000, 'rate' => 0.15],
            ['min' => 10000, 'max' => 20000, 'rate' => 0.25],
            ['min' => 20000, 'max' => 30000, 'rate' => 0.30],
            ['min' => 30000, 'max' => 40000, 'rate' => 0.33],
            ['min' => 40000, 'max' => 50000, 'rate' => 0.36],
            ['min' => 50000, 'max' => 70000, 'rate' => 0.38],
            ['min' => 70000, 'max' => null, 'rate' => 0.40],
        ];

        $totalTax = 0;
        $remaining = $annualTaxable;

        foreach ($brackets as $bracket) {
            if ($remaining <= 0) {
                break;
            }

            $taxableInBracket = $bracket['max'] === null 
                ? $remaining 
                : min($remaining, $bracket['max'] - $bracket['min']);

            if ($taxableInBracket > 0) {
                $totalTax += $taxableInBracket * $bracket['rate'];
                $remaining -= $taxableInBracket;
            }
        }

        return max(45, $totalTax); // Minimum annual tax of 45 TND
    }

    private function createPayments(): void
    {
        $payslips = Payslip::where('is_regularization_adjustment', false)->get();
        $rhUser = Utilisateur::where('role', 'RH')->first();
        $createdBy = $rhUser ? $rhUser->id : Utilisateur::first()->id;

        $paymentBatch = [];
        $batchSize = 100;

        foreach ($payslips as $payslip) {
            // Check if payment already exists
            $existing = Payment::where('payslip_id', $payslip->id)->first();
            if ($existing) {
                continue;
            }

            // Determine payment method
            $random = rand(1, 100);
            if ($random <= 70) {
                $method = 'bank_transfer';
            } elseif ($random <= 90) {
                $method = 'cash';
            } else {
                $method = 'check';
            }

            $paidAt = Carbon::parse($payslip->generated_at)->addDays(rand(1, 5));

            $paymentBatch[] = [
                'id' => Str::uuid(),
                'payslip_id' => $payslip->id,
                'method' => $method,
                'amount' => $payslip->net_salary,
                'paid_at' => $paidAt->toDateString(),
                'reference' => strtoupper(Str::random(10)),
                'created_by' => $createdBy,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if (count($paymentBatch) >= $batchSize) {
                DB::table('payments')->insert($paymentBatch);
                $paymentBatch = [];
            }
        }

        // Insert remaining
        if (!empty($paymentBatch)) {
            DB::table('payments')->insert($paymentBatch);
        }

        $totalPayments = Payment::count();
        $this->command->info("  ✓ Created {$totalPayments} payment records");
    }

    private function createRegularizationPayslips(): void
    {
        $users = Utilisateur::where('actif', true)->get();
        $ruleSet = FiscalRuleSet::where('year', 2026)->first();
        
        if (!$ruleSet) {
            $this->command->warn('  ⚠ No 2026 fiscal rule set found, skipping regularization');
            return;
        }

        $rhUser = Utilisateur::where('role', 'RH')->first();
        $generatedBy = $rhUser ? $rhUser->id : $users->first()->id;

        // Select employees for regularization scenarios
        $owingEmployees = $users->random(max(1, (int) ($users->count() * 0.3))); // 30% owing
        $refundEmployees = $users->diff($owingEmployees)->random(max(1, (int) ($users->count() * 0.2))); // 20% refund

        $regularizationBatch = [];

        foreach ($owingEmployees as $user) {
            $regularizationAmount = rand(50, 500); // Owing amount

            $regularizationBatch[] = [
                'id' => Str::uuid(),
                'employee_id' => $user->id,
                'pay_period_start' => '2025-12-31',
                'pay_period_end' => '2025-12-31',
                'rule_set_id' => $ruleSet->id,
                'base_salary_used' => 0,
                'gross_salary' => 0,
                'cnss_employee_amount' => 0,
                'cnss_employer_amount' => 0,
                'taxable_base_annual' => 0,
                'irpp_annual' => $regularizationAmount,
                'irpp_monthly' => $regularizationAmount,
                'css_amount' => 0,
                'net_salary' => -$regularizationAmount,
                'status' => 'draft',
                'version' => 1,
                'supersedes_payslip_id' => null,
                'is_regularization_adjustment' => true,
                'generated_at' => Carbon::create(2026, 1, 15),
                'generated_by' => $generatedBy,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        foreach ($refundEmployees as $user) {
            $regularizationAmount = rand(50, 300); // Refund amount

            $regularizationBatch[] = [
                'id' => Str::uuid(),
                'employee_id' => $user->id,
                'pay_period_start' => '2025-12-31',
                'pay_period_end' => '2025-12-31',
                'rule_set_id' => $ruleSet->id,
                'base_salary_used' => 0,
                'gross_salary' => 0,
                'cnss_employee_amount' => 0,
                'cnss_employer_amount' => 0,
                'taxable_base_annual' => 0,
                'irpp_annual' => -$regularizationAmount,
                'irpp_monthly' => -$regularizationAmount,
                'css_amount' => 0,
                'net_salary' => $regularizationAmount,
                'status' => 'draft',
                'version' => 1,
                'supersedes_payslip_id' => null,
                'is_regularization_adjustment' => true,
                'generated_at' => Carbon::create(2026, 1, 15),
                'generated_by' => $generatedBy,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($regularizationBatch)) {
            DB::table('payslips')->insert($regularizationBatch);
        }

        $totalRegularizations = Payslip::where('is_regularization_adjustment', true)->count();
        $this->command->info("  ✓ Created {$totalRegularizations} regularization payslips");
    }
}
