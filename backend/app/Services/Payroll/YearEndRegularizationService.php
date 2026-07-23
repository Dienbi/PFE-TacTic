<?php

namespace App\Services\Payroll;

use App\Repositories\Payroll\PayslipRepository;
use App\Repositories\Payroll\FiscalRuleSetRepository;
use App\Repositories\Payroll\EmployeeFiscalProfileRepository;
use App\Repositories\Payroll\AuditLogRepository;
use App\Models\Utilisateur;
use Illuminate\Support\Str;

class YearEndRegularizationService
{
    private PayslipRepository $payslipRepository;
    private FiscalRuleSetRepository $ruleSetRepository;
    private EmployeeFiscalProfileRepository $fiscalProfileRepository;
    private AuditLogRepository $auditLogRepository;
    private PayrollCalculationEngine $calculationEngine;

    public function __construct(
        PayslipRepository $payslipRepository,
        FiscalRuleSetRepository $ruleSetRepository,
        EmployeeFiscalProfileRepository $fiscalProfileRepository,
        AuditLogRepository $auditLogRepository,
        PayrollCalculationEngine $calculationEngine
    ) {
        $this->payslipRepository = $payslipRepository;
        $this->ruleSetRepository = $ruleSetRepository;
        $this->fiscalProfileRepository = $fiscalProfileRepository;
        $this->auditLogRepository = $auditLogRepository;
        $this->calculationEngine = $calculationEngine;
    }

    public function calculateAnnualTaxRegularization(string $employeeId, int $year, string $actorId): array
    {
        // Get all payslips for the employee in the year
        $payslips = $this->payslipRepository->findByEmployee($employeeId)
            ->filter(function ($payslip) use ($year) {
                return \Carbon\Carbon::parse($payslip->pay_period_start)->year == $year;
            });

        if ($payslips->isEmpty()) {
            throw new \Exception('No payslips found for this employee in the specified year');
        }

        // Calculate actual annual tax paid
        $actualAnnualTaxPaid = $payslips->sum('irpp_monthly') * 12;

        // Calculate actual annual income
        $actualAnnualIncome = $payslips->sum('taxable_base_annual');

        // Get the fiscal rule set used for the year
        $ruleSet = $this->ruleSetRepository->findByYear($year);
        if (!$ruleSet) {
            throw new \Exception('No fiscal rule set found for the specified year');
        }

        // Get employee's fiscal profile
        $fiscalProfile = $this->fiscalProfileRepository->findEffectiveForDate($employeeId, "{$year}-12-31");
        if (!$fiscalProfile) {
            throw new \Exception('No fiscal profile found for this employee');
        }

        // Calculate correct annual tax based on actual income
        $ruleSetData = $this->prepareRuleSetData($ruleSet);
        $fiscalProfileData = [
            'maritalStatus' => $fiscalProfile->marital_status,
            'childrenCount' => $fiscalProfile->children_count,
            'disabledChildrenCount' => $fiscalProfile->disabled_children_count,
            'studentChildrenCount' => $fiscalProfile->student_non_scholarship_children_count,
        ];

        // Calculate tax for the full year
        $calculationResult = $this->calculationEngine->calculatePayslip([
            'baseSalary' => $actualAnnualIncome / 12,
            'payItems' => [],
            'fiscalProfile' => $fiscalProfileData,
            'ruleSet' => $ruleSetData,
            'payPeriodMonths' => 12,
        ]);

        $correctAnnualTax = $calculationResult['irpp_annual'];

        // Calculate regularization amount
        $regularizationAmount = $correctAnnualTax - $actualAnnualTaxPaid;

        return [
            'employee_id' => $employeeId,
            'year' => $year,
            'actual_annual_tax_paid' => $actualAnnualTaxPaid,
            'correct_annual_tax' => $correctAnnualTax,
            'regularization_amount' => $regularizationAmount,
            'is_owing' => $regularizationAmount > 0,
            'is_refund' => $regularizationAmount < 0,
            'payslips_count' => $payslips->count(),
        ];
    }

    public function createRegularizationPayslip(string $employeeId, int $year, string $actorId): array
    {
        // Calculate regularization
        $regularization = $this->calculateAnnualTaxRegularization($employeeId, $year, $actorId);

        if (abs($regularization['regularization_amount']) < 0.001) {
            return [
                'success' => false,
                'message' => 'No regularization needed (difference is negligible)',
                'regularization_amount' => $regularization['regularization_amount'],
            ];
        }

        // Get employee
        $employee = Utilisateur::find($employeeId);
        if (!$employee) {
            throw new \Exception('Employee not found');
        }

        // Get fiscal rule set
        $ruleSet = $this->ruleSetRepository->findByYear($year);
        if (!$ruleSet) {
            throw new \Exception('No fiscal rule set found for the specified year');
        }

        // Create regularization payslip
        $regularizationPayslip = $this->payslipRepository->create([
            'employee_id' => $employeeId,
            'pay_period_start' => "{$year}-12-31",
            'pay_period_end' => "{$year}-12-31",
            'rule_set_id' => $ruleSet->id,
            'base_salary_used' => 0,
            'gross_salary' => 0,
            'cnss_employee_amount' => 0,
            'cnss_employer_amount' => 0,
            'taxable_base_annual' => $regularization['actual_annual_tax_paid'],
            'irpp_annual' => $regularization['correct_annual_tax'],
            'irpp_monthly' => $regularization['regularization_amount'],
            'css_amount' => 0,
            'net_salary' => $regularization['regularization_amount'] < 0 ? abs($regularization['regularization_amount']) : 0,
            'status' => 'draft',
            'version' => 1,
            'is_regularization_adjustment' => true,
            'generated_by' => $actorId,
        ]);

        // Log the regularization
        $this->auditLogRepository->logPayslipCorrection($actorId, $regularizationPayslip->id, [
            'action' => 'year_end_regularization',
            'year' => $year,
            'actual_annual_tax_paid' => $regularization['actual_annual_tax_paid'],
            'correct_annual_tax' => $regularization['correct_annual_tax'],
            'regularization_amount' => $regularization['regularization_amount'],
        ]);

        return [
            'regularization_payslip' => $regularizationPayslip->fresh(['employee', 'ruleSet', 'generatedBy']),
            'regularization_details' => $regularization,
            'message' => 'Year-end regularization payslip created successfully',
        ];
    }

    public function batchCalculateRegularization(int $year, string $actorId): array
    {
        // Get all active employees
        $employees = Utilisateur::where('actif', true)->get();

        $results = [];
        $owingCount = 0;
        $refundCount = 0;
        $noRegularizationCount = 0;

        foreach ($employees as $employee) {
            try {
                $regularization = $this->calculateAnnualTaxRegularization($employee->id, $year, $actorId);

                if (abs($regularization['regularization_amount']) < 0.001) {
                    $noRegularizationCount++;
                    $results[] = [
                        'employee_id' => $employee->id,
                        'employee_name' => $employee->nom . ' ' . $employee->prenom,
                        'status' => 'no_regularization',
                    ];
                } elseif ($regularization['is_owing']) {
                    $owingCount++;
                    $results[] = [
                        'employee_id' => $employee->id,
                        'employee_name' => $employee->nom . ' ' . $employee->prenom,
                        'status' => 'owing',
                        'amount' => $regularization['regularization_amount'],
                    ];
                } else {
                    $refundCount++;
                    $results[] = [
                        'employee_id' => $employee->id,
                        'employee_name' => $employee->nom . ' ' . $employee->prenom,
                        'status' => 'refund',
                        'amount' => abs($regularization['regularization_amount']),
                    ];
                }
            } catch (\Exception $e) {
                $results[] = [
                    'employee_id' => $employee->id,
                    'employee_name' => $employee->nom . ' ' . $employee->prenom,
                    'status' => 'error',
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'results' => $results,
            'summary' => [
                'total_employees' => $employees->count(),
                'owing' => $owingCount,
                'refund' => $refundCount,
                'no_regularization' => $noRegularizationCount,
            ],
            'message' => "Batch regularization calculation completed for year {$year}",
        ];
    }

    public function getYearlySummary(string $employeeId, int $year): array
    {
        $payslips = $this->payslipRepository->findByEmployee($employeeId)
            ->filter(function ($payslip) use ($year) {
                return \Carbon\Carbon::parse($payslip->pay_period_start)->year == $year;
            });

        if ($payslips->isEmpty()) {
            return [
                'employee_id' => $employeeId,
                'year' => $year,
                'total_gross_salary' => 0,
                'total_cnss_paid' => 0,
                'total_irpp_paid' => 0,
                'total_css_paid' => 0,
                'total_net_salary' => 0,
                'payslip_count' => 0,
                'payslips' => [],
                'regularization_amount' => 0,
                'regularization_type' => 'none',
            ];
        }

        $summary = [
            'employee_id' => $employeeId,
            'year' => $year,
            'total_gross_salary' => $payslips->sum('gross_salary'),
            'total_cnss_paid' => $payslips->sum('cnss_employee_amount'),
            'total_irpp_paid' => $payslips->sum('irpp_monthly'),
            'total_css_paid' => $payslips->sum('css_amount'),
            'total_net_salary' => $payslips->sum('net_salary'),
            'payslip_count' => $payslips->count(),
            'payslips' => $payslips,
        ];

        return $summary;
    }

    public function getEmployeesWithRegularizations(int $year, ?string $search = null): array
    {
        $query = \App\Models\Utilisateur::query()
            ->where('role', \App\Enums\Role::EMPLOYE)
            ->with(['payslips' => function ($query) use ($year) {
                $query->whereYear('pay_period_start', $year);
            }]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'ilike', "%{$search}%")
                  ->orWhere('prenom', 'ilike', "%{$search}%")
                  ->orWhere('matricule', 'ilike', "%{$search}%");
            });
        }

        $employees = $query->get();

        $result = $employees->map(function ($employee) use ($year) {
            $payslips = $employee->payslips->filter(function ($payslip) use ($year) {
                return \Carbon\Carbon::parse($payslip->pay_period_start)->year == $year;
            });

            // Include employees even if they have no payslips for this year
            return [
                'id' => $employee->id,
                'matricule' => $employee->matricule,
                'nom' => $employee->nom,
                'prenom' => $employee->prenom,
                'payslip_count' => $payslips->count(),
                'total_net_salary' => $payslips->sum('net_salary'),
                'has_regularization' => $payslips->contains('is_regularization_adjustment', true),
            ];
        });

        return [
            'employees' => $result,
            'total_count' => $result->count(),
        ];
    }

    private function prepareRuleSetData($ruleSet): array
    {
        $brackets = $ruleSet->irppBrackets->map(function ($bracket) {
            return [
                'min' => $bracket->min_annual_amount,
                'max' => $bracket->max_annual_amount,
                'rate' => $bracket->rate,
            ];
        })->sortBy('min')->values()->toArray();

        $deductions = $ruleSet->familyDeductionRules->map(function ($deduction) {
            return [
                'type' => $deduction->deduction_type,
                'amount' => $deduction->annual_amount,
                'maxCount' => $deduction->max_count,
            ];
        })->toArray();

        return [
            'cnssEmployeeRate' => $ruleSet->cnss_employee_rate,
            'cnssEmployerRate' => $ruleSet->cnss_employer_rate,
            'cssRate' => $ruleSet->css_rate,
            'cssExemptThreshold' => $ruleSet->css_exempt_annual_net_threshold,
            'profExpenseRate' => $ruleSet->prof_expense_rate,
            'profExpenseCap' => $ruleSet->prof_expense_annual_cap,
            'minAnnualTax' => $ruleSet->min_annual_tax,
            'irppBrackets' => $brackets,
            'familyDeductions' => $deductions,
        ];
    }
}
