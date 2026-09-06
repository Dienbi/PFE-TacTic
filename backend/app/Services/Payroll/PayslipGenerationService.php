<?php

namespace App\Services\Payroll;

use App\Repositories\Payroll\PayslipRepository;
use App\Repositories\Payroll\FiscalRuleSetRepository;
use App\Repositories\Payroll\EmployeeFiscalProfileRepository;
use App\Repositories\Payroll\PayItemRepository;
use App\Repositories\Payroll\AuditLogRepository;
use App\Models\Utilisateur;
use Illuminate\Support\Str;

class PayslipGenerationService
{
    private PayslipRepository $payslipRepository;
    private FiscalRuleSetRepository $ruleSetRepository;
    private EmployeeFiscalProfileRepository $fiscalProfileRepository;
    private PayItemRepository $payItemRepository;
    private PayrollCalculationEngine $calculationEngine;
    private AuditLogRepository $auditLogRepository;

    public function __construct(
        PayslipRepository $payslipRepository,
        FiscalRuleSetRepository $ruleSetRepository,
        EmployeeFiscalProfileRepository $fiscalProfileRepository,
        PayItemRepository $payItemRepository,
        PayrollCalculationEngine $calculationEngine,
        AuditLogRepository $auditLogRepository
    ) {
        $this->payslipRepository = $payslipRepository;
        $this->ruleSetRepository = $ruleSetRepository;
        $this->fiscalProfileRepository = $fiscalProfileRepository;
        $this->payItemRepository = $payItemRepository;
        $this->calculationEngine = $calculationEngine;
        $this->auditLogRepository = $auditLogRepository;
    }

    public function generateSinglePayslip(array $data, string $generatedBy): array
    {
        $employeeId = $data['employee_id'];
        $payPeriodStart = $data['pay_period_start'];
        $payPeriodEnd = $data['pay_period_end'];
        $payItems = $data['pay_items'] ?? [];

        // Get employee
        $employee = Utilisateur::find($employeeId);
        if (!$employee) {
            throw new \Exception('Employee not found');
        }

        // Get active fiscal rule set for the pay period
        $ruleSet = $this->ruleSetRepository->findActiveForDate($payPeriodStart);
        if (!$ruleSet) {
            throw new \Exception('No active fiscal rule set found for this period');
        }

        // Get employee's fiscal profile
        $fiscalProfile = $this->fiscalProfileRepository->findEffectiveForDate($employeeId, $payPeriodStart);
        if (!$fiscalProfile) {
            // Create default profile if none exists, using employee's actual marital status and children count
            $fiscalProfile = $this->fiscalProfileRepository->create([
                'employee_id' => $employeeId,
                'effective_from' => $employee->date_embauche ?? $payPeriodStart,
                'marital_status' => $employee->marital_status ?? 'single',
                'children_count' => $employee->children_count ?? 0,
                'disabled_children_count' => 0,
                'student_non_scholarship_children_count' => 0,
            ]);
        }

        // Calculate months worked (for annualization)
        $monthsWorked = $this->calculateMonthsWorked($employee->date_embauche, $payPeriodEnd);

        // Prepare rule set data for calculation engine
        $ruleSetData = $this->prepareRuleSetData($ruleSet);

        // Prepare fiscal profile data
        $fiscalProfileData = [
            'maritalStatus' => $fiscalProfile->marital_status,
            'childrenCount' => $fiscalProfile->children_count,
            'disabledChildrenCount' => $fiscalProfile->disabled_children_count,
            'studentChildrenCount' => $fiscalProfile->student_non_scholarship_children_count,
        ];

        // Calculate payslip using the engine
        $calculationResult = $this->calculationEngine->calculatePayslip([
            'baseSalary' => $employee->salaire_base,
            'payItems' => $payItems,
            'fiscalProfile' => $fiscalProfileData,
            'ruleSet' => $ruleSetData,
            'payPeriodMonths' => $monthsWorked,
        ]);

        // Check if payslip already exists for this period
        $existingPayslip = $this->payslipRepository->findByEmployeeAndPeriod(
            $employeeId,
            $payPeriodStart,
            $payPeriodEnd
        );

        if ($existingPayslip) {
            throw new \Exception('Payslip already exists for this employee and period');
        }

        // Create payslip
        $payslip = $this->payslipRepository->create([
            'employee_id' => $employeeId,
            'pay_period_start' => $payPeriodStart,
            'pay_period_end' => $payPeriodEnd,
            'rule_set_id' => $ruleSet->id,
            'base_salary_used' => $employee->salaire_base,
            'gross_salary' => $calculationResult['gross_salary'],
            'cnss_employee_amount' => $calculationResult['cnss_employee_amount'],
            'cnss_employer_amount' => $calculationResult['cnss_employer_amount'],
            'taxable_base_annual' => $calculationResult['taxable_base_annual'],
            'irpp_annual' => $calculationResult['irpp_annual'],
            'irpp_monthly' => $calculationResult['irpp_monthly'],
            'css_amount' => $calculationResult['css_amount'],
            'family_deduction_total' => $calculationResult['family_deduction_total'],
            'prof_expense_deduction' => $calculationResult['prof_expense_deduction'],
            'net_salary' => $calculationResult['net_salary'],
            'status' => 'draft',
            'version' => 1,
            'generated_by' => $generatedBy,
        ]);

        // Create payslip pay items
        $this->createPayslipPayItems($payslip->id, $payItems);

        // Log the action
        $this->auditLogRepository->create([
            'actor_id' => $generatedBy,
            'action' => 'payslip.generated',
            'entity_type' => 'Payslip',
            'entity_id' => $payslip->id,
            'details_json' => [
                'employee_id' => $employeeId,
                'pay_period_start' => $payPeriodStart,
                'pay_period_end' => $payPeriodEnd,
                'net_salary' => $calculationResult['net_salary'],
            ],
        ]);

        $payslip = $payslip->fresh(['employee', 'ruleSet', 'generatedBy']);

        return [
            'payslip' => [
                'id' => $payslip->id,
                'employee_id' => $payslip->employee_id,
                'pay_period_start' => $payslip->pay_period_start,
                'pay_period_end' => $payslip->pay_period_end,
                'rule_set_id' => $payslip->rule_set_id,
                'base_salary_used' => $payslip->base_salary_used,
                'gross_salary' => $payslip->gross_salary,
                'cnss_employee_amount' => $payslip->cnss_employee_amount,
                'cnss_employer_amount' => $payslip->cnss_employer_amount,
                'taxable_base_annual' => $payslip->taxable_base_annual,
                'irpp_annual' => $payslip->irpp_annual,
                'irpp_monthly' => $payslip->irpp_monthly,
                'css_amount' => $payslip->css_amount,
                'family_deduction_total' => $payslip->family_deduction_total,
                'prof_expense_deduction' => $payslip->prof_expense_deduction,
                'net_salary' => $payslip->net_salary,
                'status' => $payslip->status,
                'version' => $payslip->version,
                'supersedes_payslip_id' => $payslip->supersedes_payslip_id,
                'is_regularization_adjustment' => $payslip->is_regularization_adjustment,
                'generated_at' => $payslip->generated_at,
                'generated_by' => $payslip->generated_by,
                'created_at' => $payslip->created_at,
                'updated_at' => $payslip->updated_at,
                'employee' => $payslip->employee ? [
                    'id' => $payslip->employee->id,
                    'matricule' => $payslip->employee->matricule,
                    'nom' => $payslip->employee->nom,
                    'prenom' => $payslip->employee->prenom,
                    'email' => $payslip->employee->email,
                ] : null,
                'generated_by_user' => $payslip->generatedBy ? [
                    'id' => $payslip->generatedBy->id,
                    'nom' => $payslip->generatedBy->nom,
                    'prenom' => $payslip->generatedBy->prenom,
                ] : null,
            ],
            'calculation_details' => $calculationResult,
            'message' => 'Payslip generated successfully',
        ];
    }

    public function generateBatchPayslips(array $data, string $generatedBy): array
    {
        $employeeIds = $data['employee_ids'];
        $payPeriodStart = $data['pay_period_start'];
        $payPeriodEnd = $data['pay_period_end'];
        $payItems = $data['pay_items'] ?? [];

        $results = [];
        $successCount = 0;
        $failureCount = 0;

        foreach ($employeeIds as $employeeId) {
            try {
                $result = $this->generateSinglePayslip([
                    'employee_id' => $employeeId,
                    'pay_period_start' => $payPeriodStart,
                    'pay_period_end' => $payPeriodEnd,
                    'pay_items' => $payItems,
                ], $generatedBy);

                $results[] = [
                    'employee_id' => $employeeId,
                    'status' => 'success',
                    'payslip_id' => $result['payslip']->id,
                ];
                $successCount++;
            } catch (\Exception $e) {
                $results[] = [
                    'employee_id' => $employeeId,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ];
                $failureCount++;
            }
        }

        return [
            'results' => $results,
            'summary' => [
                'total' => count($employeeIds),
                'success' => $successCount,
                'failed' => $failureCount,
            ],
            'message' => "Batch generation completed: {$successCount} successful, {$failureCount} failed",
        ];
    }

    public function validatePayslip(string $payslipId): array
    {
        $payslip = $this->payslipRepository->validate($payslipId);

        // Log the action
        $this->auditLogRepository->create([
            'actor_id' => auth()->id(),
            'action' => 'payslip.validated',
            'entity_type' => 'Payslip',
            'entity_id' => $payslipId,
            'details_json' => [
                'employee_id' => $payslip->employee_id,
                'net_salary' => $payslip->net_salary,
            ],
        ]);

        return [
            'payslip' => $this->serializePayslip($payslip),
            'message' => 'Payslip validated successfully',
        ];
    }

    public function lockPayslip(string $payslipId): array
    {
        $payslip = $this->payslipRepository->lock($payslipId);

        // Log the action
        $this->auditLogRepository->create([
            'actor_id' => auth()->id(),
            'action' => 'payslip.locked',
            'entity_type' => 'Payslip',
            'entity_id' => $payslipId,
            'details_json' => [
                'employee_id' => $payslip->employee_id,
                'net_salary' => $payslip->net_salary,
            ],
        ]);

        return [
            'payslip' => $this->serializePayslip($payslip),
            'message' => 'Payslip locked successfully',
        ];
    }

    public function deleteDraftPayslip(string $payslipId): array
    {
        $payslip = $this->payslipRepository->findById($payslipId);
        $this->payslipRepository->delete($payslipId);

        // Log the action
        $this->auditLogRepository->create([
            'actor_id' => auth()->id(),
            'action' => 'payslip.deleted',
            'entity_type' => 'Payslip',
            'entity_id' => $payslipId,
            'details_json' => [
                'employee_id' => $payslip->employee_id ?? null,
            ],
        ]);

        return [
            'message' => 'Draft payslip deleted successfully',
        ];
    }

    public function getPayslipDetails(string $payslipId): array
    {
        $payslip = $this->payslipRepository->findById($payslipId);

        if (!$payslip) {
            throw new \Exception('Payslip not found');
        }

        return [
            'payslip' => $this->serializePayslip($payslip),
        ];
    }

    public function getEmployeePayslips(string $employeeId): array
    {
        $payslips = $this->payslipRepository->findByEmployee($employeeId);

        return [
            'payslips' => $payslips->map(fn ($p) => $this->serializePayslip($p))->values(),
        ];
    }

    public function getPeriodPayslips(string $periodStart, string $periodEnd): array
    {
        $payslips = $this->payslipRepository->findByPeriod($periodStart, $periodEnd);

        return [
            'payslips' => $payslips->map(fn ($p) => $this->serializePayslip($p))->values(),
        ];
    }

    private function serializePayslip($payslip): array
    {
        return [
            'id' => $payslip->id,
            'employee_id' => $payslip->employee_id,
            'pay_period_start' => $payslip->pay_period_start,
            'pay_period_end' => $payslip->pay_period_end,
            'rule_set_id' => $payslip->rule_set_id,
            'base_salary_used' => $payslip->base_salary_used,
            'gross_salary' => $payslip->gross_salary,
            'cnss_employee_amount' => $payslip->cnss_employee_amount,
            'cnss_employer_amount' => $payslip->cnss_employer_amount,
            'taxable_base_annual' => $payslip->taxable_base_annual,
            'irpp_annual' => $payslip->irpp_annual,
            'irpp_monthly' => $payslip->irpp_monthly,
            'css_amount' => $payslip->css_amount,
            'family_deduction_total' => $payslip->family_deduction_total,
            'prof_expense_deduction' => $payslip->prof_expense_deduction,
            'net_salary' => $payslip->net_salary,
            'status' => $payslip->status,
            'version' => $payslip->version,
            'supersedes_payslip_id' => $payslip->supersedes_payslip_id,
            'is_regularization_adjustment' => $payslip->is_regularization_adjustment,
            'generated_at' => $payslip->generated_at,
            'generated_by' => $payslip->generated_by,
            'created_at' => $payslip->created_at,
            'updated_at' => $payslip->updated_at,
            'employee' => $payslip->employee ? [
                'id' => $payslip->employee->id,
                'matricule' => $payslip->employee->matricule,
                'nom' => $payslip->employee->nom,
                'prenom' => $payslip->employee->prenom,
                'email' => $payslip->employee->email,
                'telephone' => $payslip->employee->telephone,
                'adresse' => $payslip->employee->adresse,
                'date_embauche' => $payslip->employee->date_embauche,
                'type_contrat' => $payslip->employee->type_contrat,
                'salaire_base' => $payslip->employee->salaire_base,
                'solde_conge' => $payslip->employee->solde_conge,
                'marital_status' => $payslip->employee->marital_status,
                'children_count' => $payslip->employee->children_count,
            ] : null,
            'generated_by_user' => $payslip->generatedBy ? [
                'id' => $payslip->generatedBy->id,
                'nom' => $payslip->generatedBy->nom,
                'prenom' => $payslip->generatedBy->prenom,
            ] : null,
            'payments' => $payslip->payments ?? [],
        ];
    }

    private function calculateMonthsWorked(?string $hireDate, string $periodEnd): int
    {
        if (!$hireDate) {
            return 12; // Assume full year if no hire date
        }

        $hire = \Carbon\Carbon::parse($hireDate);
        $end = \Carbon\Carbon::parse($periodEnd);

        $months = $hire->diffInMonths($end) + 1;

        return min($months, 12);
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

    private function createPayslipPayItems(string $payslipId, array $payItems): void
    {
        foreach ($payItems as $payItem) {
            \App\Models\PayslipPayItem::create([
                'id' => Str::uuid(),
                'payslip_id' => $payslipId,
                'pay_item_id' => $payItem['pay_item_id'] ?? null,
                'name_snapshot' => $payItem['name'] ?? 'Custom Item',
                'amount' => $payItem['amount'],
                'was_taxable' => $payItem['is_taxable'] ?? true,
                'was_cnss_applicable' => $payItem['is_cnss_applicable'] ?? true,
            ]);
        }
    }

    public function getAllPayslips(array $filters = []): array
    {
        $query = \App\Models\Payslip::with(['employee', 'generatedBy', 'payments']);

        if (isset($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['date_from'])) {
            $query->where('pay_period_start', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('pay_period_end', '<=', $filters['date_to']);
        }

        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('nom', 'ilike', "%{$search}%")
                  ->orWhere('prenom', 'ilike', "%{$search}%")
                  ->orWhere('matricule', 'ilike', "%{$search}%");
            });
        }

        $payslips = $query->orderBy('pay_period_start', 'desc')->get()->map(function ($payslip) {
            // Load employee manually if not loaded (handles soft-deleted employees)
            if (!$payslip->employee && $payslip->employee_id) {
                $payslip->employee = \App\Models\Utilisateur::withTrashed()->find($payslip->employee_id);
            }

            return [
                'id' => $payslip->id,
                'employee_id' => $payslip->employee_id,
                'pay_period_start' => $payslip->pay_period_start,
                'pay_period_end' => $payslip->pay_period_end,
                'rule_set_id' => $payslip->rule_set_id,
                'base_salary_used' => $payslip->base_salary_used,
                'gross_salary' => $payslip->gross_salary,
                'cnss_employee_amount' => $payslip->cnss_employee_amount,
                'cnss_employer_amount' => $payslip->cnss_employer_amount,
                'taxable_base_annual' => $payslip->taxable_base_annual,
                'irpp_annual' => $payslip->irpp_annual,
                'irpp_monthly' => $payslip->irpp_monthly,
                'css_amount' => $payslip->css_amount,
                'family_deduction_total' => $payslip->family_deduction_total,
                'prof_expense_deduction' => $payslip->prof_expense_deduction,
                'net_salary' => $payslip->net_salary,
                'status' => $payslip->status,
                'version' => $payslip->version,
                'supersedes_payslip_id' => $payslip->supersedes_payslip_id,
                'is_regularization_adjustment' => $payslip->is_regularization_adjustment,
                'generated_at' => $payslip->generated_at,
                'generated_by' => $payslip->generated_by,
                'created_at' => $payslip->created_at,
                'updated_at' => $payslip->updated_at,
                'employee' => $payslip->employee ? [
                    'id' => $payslip->employee->id,
                    'matricule' => $payslip->employee->matricule,
                    'nom' => $payslip->employee->nom,
                    'prenom' => $payslip->employee->prenom,
                    'email' => $payslip->employee->email,
                    'telephone' => $payslip->employee->telephone,
                    'adresse' => $payslip->employee->adresse,
                    'date_embauche' => $payslip->employee->date_embauche,
                    'type_contrat' => $payslip->employee->type_contrat,
                    'salaire_base' => $payslip->employee->salaire_base,
                    'solde_conge' => $payslip->employee->solde_conge,
                    'marital_status' => $payslip->employee->marital_status,
                    'children_count' => $payslip->employee->children_count,
                ] : null,
                'generated_by_user' => $payslip->generatedBy ? [
                    'id' => $payslip->generatedBy->id,
                    'nom' => $payslip->generatedBy->nom,
                    'prenom' => $payslip->generatedBy->prenom,
                ] : null,
                'payments' => $payslip->payments,
            ];
        })->values();

        return [
            'payslips' => $payslips,
        ];
    }

    public function getGlobalStats(): array
    {
        return $this->payslipRepository->getGlobalStats();
    }
}
