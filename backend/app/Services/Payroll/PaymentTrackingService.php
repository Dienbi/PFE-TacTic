<?php

namespace App\Services\Payroll;

use App\Repositories\Payroll\PaymentRepository;
use App\Repositories\Payroll\PayslipRepository;
use App\Repositories\Payroll\AuditLogRepository;
use Illuminate\Support\Str;

class PaymentTrackingService
{
    private PaymentRepository $paymentRepository;
    private PayslipRepository $payslipRepository;
    private AuditLogRepository $auditLogRepository;

    public function __construct(
        PaymentRepository $paymentRepository,
        PayslipRepository $payslipRepository,
        AuditLogRepository $auditLogRepository
    ) {
        $this->paymentRepository = $paymentRepository;
        $this->payslipRepository = $payslipRepository;
        $this->auditLogRepository = $auditLogRepository;
    }

    public function recordPayment(array $data, string $createdBy): array
    {
        $payslipId = $data['payslip_id'];
        $amount = $data['amount'];
        $method = $data['method'];
        $paidAt = $data['paid_at'];
        $reference = $data['reference'] ?? null;

        // Get payslip
        $payslip = $this->payslipRepository->findById($payslipId);
        if (!$payslip) {
            throw new \Exception('Payslip not found');
        }

        // Check if payslip is locked
        if ($payslip->status !== 'locked') {
            throw new \Exception('Payments can only be recorded for locked payslips');
        }

        // Check if payment amount exceeds net salary
        $totalPaid = $this->paymentRepository->getTotalPaidForPayslip($payslipId);
        $remaining = $payslip->net_salary - $totalPaid;

        if ($amount > $remaining) {
            throw new \Exception("Payment amount ({$amount}) exceeds remaining balance ({$remaining})");
        }

        // Create payment
        $payment = $this->paymentRepository->create([
            'payslip_id' => $payslipId,
            'method' => $method,
            'amount' => $amount,
            'paid_at' => $paidAt,
            'reference' => $reference,
            'created_by' => $createdBy,
        ]);

        // Log the action
        $this->auditLogRepository->logPaymentRecorded($createdBy, $payment->id, [
            'payslip_id' => $payslipId,
            'employee_id' => $payslip->employee_id,
            'amount' => $amount,
            'method' => $method,
        ]);

        return [
            'payment' => $this->serializePayment($payment->fresh(['payslip.employee', 'createdBy'])),
            'remaining_balance' => $payslip->net_salary - ($totalPaid + $amount),
            'message' => 'Payment recorded successfully',
        ];
    }

    public function getPaymentDetails(string $paymentId): array
    {
        $payment = $this->paymentRepository->findById($paymentId);

        if (!$payment) {
            throw new \Exception('Payment not found');
        }

        return [
            'payment' => $this->serializePayment($payment),
        ];
    }

    public function getPayslipPayments(string $payslipId): array
    {
        $payments = $this->paymentRepository->findByPayslip($payslipId);
        $payslip = $this->payslipRepository->findById($payslipId);
        $totalPaid = $this->paymentRepository->getTotalPaidForPayslip($payslipId);

        return [
            'payments' => $payments->map(fn ($p) => $this->serializePayment($p))->values(),
            'total_paid' => $totalPaid,
            'net_salary' => $payslip->net_salary,
            'remaining_balance' => $payslip->net_salary - $totalPaid,
            'is_fully_paid' => $totalPaid >= $payslip->net_salary,
        ];
    }

    public function getEmployeePaymentHistory(string $employeeId): array
    {
        $payments = $this->paymentRepository->findByEmployee($employeeId);

        return [
            'payments' => $payments->map(fn ($p) => $this->serializePayment($p))->values(),
        ];
    }

    public function updatePayment(string $paymentId, array $data, string $updatedBy): array
    {
        $payment = $this->paymentRepository->findById($paymentId);

        if (!$payment) {
            throw new \Exception('Payment not found');
        }

        // Get payslip
        $payslip = $this->payslipRepository->findById($payment->payslip_id);

        // Calculate new total if amount is being changed
        if (isset($data['amount']) && $data['amount'] !== $payment->amount) {
            $totalPaid = $this->paymentRepository->getTotalPaidForPayslip($payment->payslip_id) - $payment->amount;
            $newTotal = $totalPaid + $data['amount'];

            if ($newTotal > $payslip->net_salary) {
                throw new \Exception("New payment amount would exceed net salary");
            }
        }

        $updated = $this->paymentRepository->update($paymentId, $data);

        return [
            'payment' => $this->serializePayment($updated->fresh(['payslip.employee', 'createdBy'])),
            'message' => 'Payment updated successfully',
        ];
    }

    private function serializePayment($payment): array
    {
        return [
            'id' => $payment->id,
            'payslip_id' => $payment->payslip_id,
            'method' => $payment->method,
            'amount' => $payment->amount,
            'paid_at' => $payment->paid_at,
            'reference' => $payment->reference,
            'created_by' => $payment->created_by,
            'created_at' => $payment->created_at,
            'updated_at' => $payment->updated_at,
            'payslip' => $payment->payslip ? [
                'id' => $payment->payslip->id,
                'employee_id' => $payment->payslip->employee_id,
                'pay_period_start' => $payment->payslip->pay_period_start,
                'pay_period_end' => $payment->payslip->pay_period_end,
                'net_salary' => $payment->payslip->net_salary,
                'employee' => $payment->payslip->employee ? [
                    'id' => $payment->payslip->employee->id,
                    'matricule' => $payment->payslip->employee->matricule,
                    'nom' => $payment->payslip->employee->nom,
                    'prenom' => $payment->payslip->employee->prenom,
                    'email' => $payment->payslip->employee->email,
                ] : null,
            ] : null,
            'created_by_user' => $payment->createdBy ? [
                'id' => $payment->createdBy->id,
                'nom' => $payment->createdBy->nom,
                'prenom' => $payment->createdBy->prenom,
            ] : null,
        ];
    }

    public function deletePayment(string $paymentId): array
    {
        $payment = $this->paymentRepository->findById($paymentId);

        if (!$payment) {
            throw new \Exception('Payment not found');
        }

        $this->paymentRepository->delete($paymentId);

        return [
            'message' => 'Payment deleted successfully',
        ];
    }

    public function getAllPayments(array $filters = []): array
    {
        $query = \App\Models\Payment::with(['payslip.employee', 'createdBy']);

        if (isset($filters['employee_id'])) {
            $query->whereHas('payslip', function ($q) use ($filters) {
                $q->where('employee_id', $filters['employee_id']);
            });
        }

        if (isset($filters['date_from'])) {
            $query->where('paid_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('paid_at', '<=', $filters['date_to']);
        }

        $payments = $query->orderBy('paid_at', 'desc')->get()->map(function ($payment) {
            return [
                'id' => $payment->id,
                'payslip_id' => $payment->payslip_id,
                'method' => $payment->method,
                'amount' => $payment->amount,
                'paid_at' => $payment->paid_at,
                'reference' => $payment->reference,
                'created_by' => $payment->created_by,
                'created_at' => $payment->created_at,
                'updated_at' => $payment->updated_at,
                'payslip' => $payment->payslip ? [
                    'id' => $payment->payslip->id,
                    'employee_id' => $payment->payslip->employee_id,
                    'pay_period_start' => $payment->payslip->pay_period_start,
                    'pay_period_end' => $payment->payslip->pay_period_end,
                    'net_salary' => $payment->payslip->net_salary,
                    'employee' => $payment->payslip->employee ? [
                        'id' => $payment->payslip->employee->id,
                        'matricule' => $payment->payslip->employee->matricule,
                        'nom' => $payment->payslip->employee->nom,
                        'prenom' => $payment->payslip->employee->prenom,
                        'email' => $payment->payslip->employee->email,
                    ] : null,
                ] : null,
                'created_by_user' => $payment->createdBy ? [
                    'id' => $payment->createdBy->id,
                    'nom' => $payment->createdBy->nom,
                    'prenom' => $payment->createdBy->prenom,
                ] : null,
            ];
        })->values();

        return [
            'payments' => $payments,
        ];
    }

    public function getPaymentStatistics(array $filters = []): array
    {
        $query = \App\Models\Payment::with(['payslip.employee', 'createdBy']);

        if (isset($filters['employee_id'])) {
            $query->whereHas('payslip', function ($q) use ($filters) {
                $q->where('employee_id', $filters['employee_id']);
            });
        }

        if (isset($filters['date_from'])) {
            $query->where('paid_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('paid_at', '<=', $filters['date_to']);
        }

        if (isset($filters['method'])) {
            $query->where('method', $filters['method']);
        }

        $payments = $query->orderBy('paid_at', 'desc')->get();

        $totalPaid = $payments->sum('amount');
        $pendingAmount = 0;
        $paymentCount = $payments->count();

        $byMethod = $payments->groupBy('method')->map(function ($group) {
            return $group->sum('amount');
        });

        return [
            'total_paid' => $totalPaid,
            'total_pending' => $pendingAmount,
            'payment_count' => $paymentCount,
            'by_method' => $byMethod,
        ];
    }
}
