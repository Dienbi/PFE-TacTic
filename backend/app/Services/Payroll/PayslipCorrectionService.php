<?php

namespace App\Services\Payroll;

use App\Repositories\Payroll\PayslipRepository;
use App\Repositories\Payroll\PaymentRepository;
use App\Repositories\Payroll\AuditLogRepository;
use App\Repositories\Payroll\FiscalRuleSetRepository;
use App\Repositories\Payroll\EmployeeFiscalProfileRepository;
use App\Models\Utilisateur;
use Illuminate\Support\Str;

class PayslipCorrectionService
{
    private PayslipRepository $payslipRepository;
    private PaymentRepository $paymentRepository;
    private AuditLogRepository $auditLogRepository;
    private FiscalRuleSetRepository $ruleSetRepository;
    private EmployeeFiscalProfileRepository $fiscalProfileRepository;
    private PayrollCalculationEngine $calculationEngine;

    public function __construct(
        PayslipRepository $payslipRepository,
        PaymentRepository $paymentRepository,
        AuditLogRepository $auditLogRepository,
        FiscalRuleSetRepository $ruleSetRepository,
        EmployeeFiscalProfileRepository $fiscalProfileRepository,
        PayrollCalculationEngine $calculationEngine
    ) {
        $this->payslipRepository = $payslipRepository;
        $this->paymentRepository = $paymentRepository;
        $this->auditLogRepository = $auditLogRepository;
        $this->ruleSetRepository = $ruleSetRepository;
        $this->fiscalProfileRepository = $fiscalProfileRepository;
        $this->calculationEngine = $calculationEngine;
    }

    public function createCorrection(string $originalPayslipId, array $correctionData, string $actorId): array
    {
        $originalPayslip = $this->payslipRepository->findById($originalPayslipId);

        if (!$originalPayslip) {
            throw new \Exception('Original payslip not found');
        }

        // Check if original payslip is locked
        if ($originalPayslip->status !== 'locked') {
            return [
                'success' => false,
                'message' => 'Only locked payslips can be corrected. Current status: ' . $originalPayslip->status,
            ];
        }

        // Check if payments have been made
        $totalPaid = $this->paymentRepository->getTotalPaidForPayslip($originalPayslipId);
        if ($totalPaid > 0) {
            return [
                'success' => false,
                'message' => 'Cannot correct payslip with existing payments',
            ];
        }

        // Get correction reason
        $reason = $correctionData['reason'] ?? 'Manual correction';

        // Re-calculate with new data
        $recalculated = $this->recalculatePayslip($originalPayslip, $correctionData);

        // Create correction payslip
        $correctionPayslip = $this->payslipRepository->createCorrection([
            'employee_id' => $originalPayslip->employee_id,
            'pay_period_start' => $originalPayslip->pay_period_start,
            'pay_period_end' => $originalPayslip->pay_period_end,
            'rule_set_id' => $originalPayslip->rule_set_id,
            'base_salary_used' => $recalculated['base_salary_used'],
            'gross_salary' => $recalculated['gross_salary'],
            'cnss_employee_amount' => $recalculated['cnss_employee_amount'],
            'cnss_employer_amount' => $recalculated['cnss_employer_amount'],
            'taxable_base_annual' => $recalculated['taxable_base_annual'],
            'irpp_annual' => $recalculated['irpp_annual'],
            'irpp_monthly' => $recalculated['irpp_monthly'],
            'css_amount' => $recalculated['css_amount'],
            'net_salary' => $recalculated['net_salary'],
            'status' => 'draft',
            'is_regularization_adjustment' => $correctionData['is_regularization'] ?? false,
            'generated_by' => $actorId,
        ], $originalPayslipId);

        // Copy pay items if provided
        if (isset($correctionData['pay_items'])) {
            $this->copyPayItems($correctionPayslip->id, $correctionData['pay_items']);
        }

        // Log the correction
        $this->auditLogRepository->logPayslipCorrection($actorId, $correctionPayslip->id, [
            'original_payslip_id' => $originalPayslipId,
            'version' => $correctionPayslip->version,
            'reason' => $reason,
            'changes' => $this->calculateChanges($originalPayslip, $correctionPayslip),
        ]);

        return [
            'correction_payslip' => $correctionPayslip->fresh(['employee', 'ruleSet', 'generatedBy']),
            'original_payslip' => $originalPayslip,
            'changes' => $this->calculateChanges($originalPayslip, $correctionPayslip),
            'message' => 'Correction payslip created successfully',
        ];
    }

    public function getCorrectionHistory(string $payslipId): array
    {
        $payslip = $this->payslipRepository->findById($payslipId);

        if (!$payslip) {
            throw new \Exception('Payslip not found');
        }

        // Reload with relationships to get the full chain
        $payslip = \App\Models\Payslip::with(['supersedes', 'supersedes.supersedes', 'employee', 'ruleSet', 'generatedBy'])->find($payslipId);

        // Get all versions of this payslip
        $versions = collect([$payslip]);

        // Follow the chain of superseded payslips (go deeper if needed)
        $current = $payslip;
        while ($current->supersedes) {
            $versions->push($current->supersedes);
            $current = $current->supersedes;
        }

        // Also check if this payslip has been superseded by another (include newer versions)
        $supersededBy = \App\Models\Payslip::where('supersedes_payslip_id', $payslipId)
            ->with(['supersedes', 'employee', 'ruleSet', 'generatedBy'])
            ->get();
        
        foreach ($supersededBy as $newer) {
            if (!$versions->contains('id', $newer->id)) {
                $versions->push($newer);
            }
        }

        // Sort by version number
        $versions = $versions->sortBy('version')->values();

        return [
            'versions' => $versions,
            'current_version' => $payslip->version,
        ];
    }

    public function compareVersions(string $payslipId1, string $payslipId2): array
    {
        $payslip1 = $this->payslipRepository->findById($payslipId1);
        $payslip2 = $this->payslipRepository->findById($payslipId2);

        if (!$payslip1 || !$payslip2) {
            throw new \Exception('One or both payslips not found');
        }

        return [
            'payslip_1' => $payslip1,
            'payslip_2' => $payslip2,
            'differences' => $this->calculateChanges($payslip1, $payslip2),
        ];
    }

    public function revertToVersion(string $currentPayslipId, string $targetVersionId, string $actorId): array
    {
        $currentPayslip = $this->payslipRepository->findById($currentPayslipId);
        $targetPayslip = $this->payslipRepository->findById($targetVersionId);

        if (!$currentPayslip || !$targetPayslip) {
            throw new \Exception('One or both payslips not found');
        }

        // Check if payments exist on current payslip
        $totalPaid = $this->paymentRepository->getTotalPaidForPayslip($currentPayslipId);
        if ($totalPaid > 0) {
            return [
                'success' => false,
                'message' => 'Cannot revert payslip with existing payments',
            ];
        }

        // Delete the current correction payslip
        $this->payslipRepository->delete($currentPayslipId);

        // Restore the target payslip from superseded to locked
        if ($targetPayslip->status === 'superseded') {
            $targetPayslip->update(['status' => 'locked']);
        }

        // Log the revert
        $this->auditLogRepository->logPayslipCorrection($actorId, $targetVersionId, [
            'action' => 'revert',
            'deleted_payslip_id' => $currentPayslipId,
            'restored_payslip_id' => $targetVersionId,
            'restored_version' => $targetPayslip->version,
        ]);

        return [
            'success' => true,
            'restored_payslip' => $targetPayslip->fresh(['employee', 'ruleSet', 'generatedBy']),
            'message' => 'Successfully reverted to version ' . $targetPayslip->version,
        ];
    }

    private function recalculatePayslip($originalPayslip, array $correctionData): array
    {
        $employee = Utilisateur::find($originalPayslip->employee_id);
        $ruleSet = $this->ruleSetRepository->findById($originalPayslip->rule_set_id);
        $fiscalProfile = $this->fiscalProfileRepository->findEffectiveForDate(
            $originalPayslip->employee_id,
            $originalPayslip->pay_period_start
        );

        // Use corrected base salary if provided
        $baseSalary = $correctionData['base_salary'] ?? $employee->salaire_base;

        // Use corrected pay items if provided
        $payItems = $correctionData['pay_items'] ?? [];

        // Prepare rule set data
        $ruleSetData = $this->prepareRuleSetData($ruleSet);

        // Prepare fiscal profile data
        $fiscalProfileData = [
            'maritalStatus' => $fiscalProfile->marital_status,
            'childrenCount' => $fiscalProfile->children_count,
            'disabledChildrenCount' => $fiscalProfile->disabled_children_count,
            'studentChildrenCount' => $fiscalProfile->student_non_scholarship_children_count,
        ];

        // Calculate months worked
        $monthsWorked = $this->calculateMonthsWorked($employee->date_embauche, $originalPayslip->pay_period_end);

        // Recalculate
        $result = $this->calculationEngine->calculatePayslip([
            'baseSalary' => $baseSalary,
            'payItems' => $payItems,
            'fiscalProfile' => $fiscalProfileData,
            'ruleSet' => $ruleSetData,
            'payPeriodMonths' => $monthsWorked,
        ]);

        return array_merge($result, ['base_salary_used' => $baseSalary]);
    }

    private function calculateChanges($original, $corrected): array
    {
        return [
            'base_salary' => [
                'from' => $original->base_salary_used,
                'to' => $corrected->base_salary_used,
                'difference' => $corrected->base_salary_used - $original->base_salary_used,
            ],
            'gross_salary' => [
                'from' => $original->gross_salary,
                'to' => $corrected->gross_salary,
                'difference' => $corrected->gross_salary - $original->gross_salary,
            ],
            'net_salary' => [
                'from' => $original->net_salary,
                'to' => $corrected->net_salary,
                'difference' => $corrected->net_salary - $original->net_salary,
            ],
            'irpp_monthly' => [
                'from' => $original->irpp_monthly,
                'to' => $corrected->irpp_monthly,
                'difference' => $corrected->irpp_monthly - $original->irpp_monthly,
            ],
        ];
    }

    private function copyPayItems(string $payslipId, array $payItems): void
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

    private function copyPayItemsFromPayslip(string $targetPayslipId, string $sourcePayslipId): void
    {
        $sourceItems = \App\Models\PayslipPayItem::where('payslip_id', $sourcePayslipId)->get();

        foreach ($sourceItems as $item) {
            \App\Models\PayslipPayItem::create([
                'id' => Str::uuid(),
                'payslip_id' => $targetPayslipId,
                'pay_item_id' => $item->pay_item_id,
                'name_snapshot' => $item->name_snapshot,
                'amount' => $item->amount,
                'was_taxable' => $item->was_taxable,
                'was_cnss_applicable' => $item->was_cnss_applicable,
            ]);
        }
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

    private function calculateMonthsWorked(?string $hireDate, string $periodEnd): int
    {
        if (!$hireDate) {
            return 12;
        }

        $hire = \Carbon\Carbon::parse($hireDate);
        $end = \Carbon\Carbon::parse($periodEnd);
        
        $months = $hire->diffInMonths($end) + 1;
        
        return min($months, 12);
    }
}
