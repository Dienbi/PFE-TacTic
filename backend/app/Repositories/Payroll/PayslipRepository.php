<?php

namespace App\Repositories\Payroll;

use App\Models\Payslip;
use App\Models\PayslipPayItem;
use Illuminate\Support\Str;

class PayslipRepository
{
    public function create(array $data): Payslip
    {
        return Payslip::create([
            'id' => $data['id'] ?? Str::uuid(),
            'employee_id' => $data['employee_id'],
            'pay_period_start' => $data['pay_period_start'],
            'pay_period_end' => $data['pay_period_end'],
            'rule_set_id' => $data['rule_set_id'],
            'base_salary_used' => $data['base_salary_used'],
            'gross_salary' => $data['gross_salary'],
            'cnss_employee_amount' => $data['cnss_employee_amount'],
            'cnss_employer_amount' => $data['cnss_employer_amount'],
            'taxable_base_annual' => $data['taxable_base_annual'],
            'irpp_annual' => $data['irpp_annual'],
            'irpp_monthly' => $data['irpp_monthly'],
            'css_amount' => $data['css_amount'],
            'net_salary' => $data['net_salary'],
            'status' => $data['status'] ?? 'draft',
            'version' => $data['version'] ?? 1,
            'supersedes_payslip_id' => $data['supersedes_payslip_id'] ?? null,
            'is_regularization_adjustment' => $data['is_regularization_adjustment'] ?? false,
            'generated_at' => $data['generated_at'] ?? now(),
            'generated_by' => $data['generated_by'],
        ]);
    }

    public function update(string $id, array $data): Payslip
    {
        $payslip = $this->findById($id);
        $payslip->update($data);
        return $payslip->fresh();
    }

    public function findById(string $id): ?Payslip
    {
        return Payslip::with(['employee', 'ruleSet', 'generatedBy', 'payslipPayItems', 'payments'])->find($id);
    }

    public function findByEmployee(string $employeeId): \Illuminate\Database\Eloquent\Collection
    {
        return Payslip::where('employee_id', $employeeId)
            ->with(['employee', 'ruleSet', 'payments'])
            ->orderBy('pay_period_start', 'desc')
            ->get();
    }

    public function findByEmployeeAndPeriod(string $employeeId, string $periodStart, string $periodEnd): ?Payslip
    {
        return Payslip::where('employee_id', $employeeId)
            ->where('pay_period_start', $periodStart)
            ->where('pay_period_end', $periodEnd)
            ->latestVersion()
            ->first();
    }

    public function findByPeriod(string $periodStart, string $periodEnd): \Illuminate\Database\Eloquent\Collection
    {
        return Payslip::where('pay_period_start', $periodStart)
            ->where('pay_period_end', $periodEnd)
            ->with(['employee', 'payments'])
            ->get();
    }

    public function validate(string $id): Payslip
    {
        $payslip = $this->findById($id);
        
        if ($payslip->status !== 'draft') {
            throw new \Exception('Only draft payslips can be validated');
        }
        
        $payslip->update(['status' => 'validated']);
        return $payslip->fresh();
    }

    public function lock(string $id): Payslip
    {
        $payslip = $this->findById($id);
        
        if ($payslip->status !== 'validated') {
            throw new \Exception('Only validated payslips can be locked');
        }
        
        $payslip->update(['status' => 'locked']);
        return $payslip->fresh();
    }

    public function supersede(string $id): Payslip
    {
        $payslip = $this->findById($id);
        
        // Allow locked, draft, and superseded status for superseding (for correction workflow)
        if (!in_array($payslip->status, ['locked', 'draft', 'superseded'])) {
            throw new \Exception('Only locked, draft, or superseded payslips can be superseded');
        }
        
        $payslip->update(['status' => 'superseded']);
        return $payslip->fresh();
    }

    public function createCorrection(array $data, string $supersedesId): Payslip
    {
        $oldPayslip = $this->findById($supersedesId);
        
        // Supersede the old payslip
        $this->supersede($supersedesId);
        
        // Create new version
        return $this->create(array_merge($data, [
            'version' => $oldPayslip->version + 1,
            'supersedes_payslip_id' => $supersedesId,
        ]));
    }

    public function getDrafts(): \Illuminate\Database\Eloquent\Collection
    {
        return Payslip::draft()->with(['employee'])->orderBy('pay_period_start', 'desc')->get();
    }

    public function getValidated(): \Illuminate\Database\Eloquent\Collection
    {
        return Payslip::validated()->with(['employee'])->orderBy('pay_period_start', 'desc')->get();
    }

    public function getLocked(): \Illuminate\Database\Eloquent\Collection
    {
        return Payslip::locked()->with(['employee'])->orderBy('pay_period_start', 'desc')->get();
    }

    public function getEmployeePaymentHistory(string $employeeId): \Illuminate\Database\Eloquent\Collection
    {
        return Payslip::where('employee_id', $employeeId)
            ->latestVersion()
            ->with(['payments'])
            ->orderBy('pay_period_start', 'desc')
            ->get();
    }

    public function delete(string $id): bool
    {
        $payslip = $this->findById($id);
        
        // Allow deletion of draft and superseded payslips (for correction workflow)
        if (!in_array($payslip->status, ['draft', 'superseded'])) {
            throw new \Exception('Cannot delete non-draft or non-superseded payslips');
        }
        
        return $payslip->delete();
    }
}
