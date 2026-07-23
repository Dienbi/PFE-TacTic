<?php

namespace App\Repositories\Payroll;

use App\Models\Payment;
use Illuminate\Support\Str;

class PaymentRepository
{
    public function create(array $data): Payment
    {
        return Payment::create([
            'id' => $data['id'] ?? Str::uuid(),
            'payslip_id' => $data['payslip_id'],
            'method' => $data['method'],
            'amount' => $data['amount'],
            'paid_at' => $data['paid_at'],
            'reference' => $data['reference'] ?? null,
            'created_by' => $data['created_by'],
        ]);
    }

    public function update(string $id, array $data): Payment
    {
        $payment = $this->findById($id);
        $payment->update($data);
        return $payment->fresh();
    }

    public function findById(string $id): ?Payment
    {
        return Payment::with(['payslip.employee', 'createdBy'])->find($id);
    }

    public function findByPayslip(string $payslipId): \Illuminate\Database\Eloquent\Collection
    {
        return Payment::where('payslip_id', $payslipId)
            ->with(['payslip.employee', 'createdBy'])
            ->orderBy('paid_at', 'desc')
            ->get();
    }

    public function findByEmployee(string $employeeId): \Illuminate\Database\Eloquent\Collection
    {
        return Payment::whereHas('payslip', function ($query) use ($employeeId) {
            $query->where('employee_id', $employeeId);
        })
        ->with(['payslip.employee', 'createdBy'])
        ->orderBy('paid_at', 'desc')
        ->get();
    }

    public function getTotalPaidForPayslip(string $payslipId): float
    {
        return Payment::where('payslip_id', $payslipId)->sum('amount');
    }

    public function delete(string $id): bool
    {
        return Payment::destroy($id);
    }
}
