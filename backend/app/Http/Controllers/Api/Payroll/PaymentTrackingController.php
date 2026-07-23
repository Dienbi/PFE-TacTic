<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Controller;
use App\Services\Payroll\PaymentTrackingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PaymentTrackingController extends Controller
{
    private PaymentTrackingService $service;

    public function __construct(PaymentTrackingService $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        $request->validate([
            'employee_id' => 'nullable|exists:utilisateurs,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $result = $this->service->getAllPayments($request->all());

        return response()->json($result);
    }

    public function record(Request $request)
    {
        $validated = $request->validate([
            'payslip_id' => 'required|exists:payslips,id',
            'method' => 'required|in:bank_transfer,cash,check',
            'amount' => 'required|numeric|min:0',
            'paid_at' => 'required|date',
            'reference' => 'nullable|string',
        ]);

        \Log::info('Payment recording request', $validated);

        $result = $this->service->recordPayment($request->all(), Auth::id());

        return response()->json($result, 201);
    }

    public function show(string $id)
    {
        $result = $this->service->getPaymentDetails($id);

        return response()->json($result);
    }

    public function getByPayslip(string $payslipId)
    {
        $result = $this->service->getPayslipPayments($payslipId);

        return response()->json($result);
    }

    public function getByEmployee(string $employeeId)
    {
        $result = $this->service->getEmployeePaymentHistory($employeeId);

        return response()->json($result);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'method' => 'sometimes|in:bank_transfer,cash,check',
            'amount' => 'sometimes|numeric|min:0',
            'paid_at' => 'sometimes|date',
            'reference' => 'nullable|sometimes|string',
        ]);

        $result = $this->service->updatePayment($id, $request->all(), Auth::id());

        return response()->json($result);
    }

    public function delete(string $id)
    {
        $result = $this->service->deletePayment($id);

        return response()->json($result);
    }

    public function statistics(Request $request)
    {
        $request->validate([
            'employee_id' => 'nullable|exists:utilisateurs,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'method' => 'nullable|in:bank_transfer,cash,check',
        ]);

        $result = $this->service->getPaymentStatistics($request->all());

        return response()->json($result);
    }
}
