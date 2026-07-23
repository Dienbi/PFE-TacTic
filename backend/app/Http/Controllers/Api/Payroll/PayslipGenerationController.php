<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Controller;
use App\Services\Payroll\PayslipGenerationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PayslipGenerationController extends Controller
{
    private PayslipGenerationService $service;

    public function __construct(PayslipGenerationService $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        $request->validate([
            'employee_id' => 'nullable|exists:utilisateurs,id',
            'status' => 'nullable|in:draft,validated,locked',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'search' => 'nullable|string',
        ]);

        $result = $this->service->getAllPayslips($request->all());

        return response()->json($result);
    }

    public function generateSingle(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:utilisateurs,id',
            'pay_period_start' => 'required|date',
            'pay_period_end' => 'required|date|after_or_equal:pay_period_start',
            'pay_items' => 'array',
            'pay_items.*.pay_item_id' => 'nullable|exists:pay_items,id',
            'pay_items.*.name' => 'required_without:pay_items.*.pay_item_id|string',
            'pay_items.*.amount' => 'required|numeric|min:0',
            'pay_items.*.is_taxable' => 'boolean',
            'pay_items.*.is_cnss_applicable' => 'boolean',
        ]);

        \Log::info('Payslip generation request', $validated);

        $result = $this->service->generateSinglePayslip($request->all(), Auth::id());

        return response()->json($result, 201);
    }

    public function generateBatch(Request $request)
    {
        $request->validate([
            'employee_ids' => 'required|array|min:1',
            'employee_ids.*' => 'exists:utilisateurs,id',
            'pay_period_start' => 'required|date',
            'pay_period_end' => 'required|date|after_or_equal:pay_period_start',
            'pay_items' => 'array',
            'pay_items.*.pay_item_id' => 'nullable|exists:pay_items,id',
            'pay_items.*.name' => 'required_without:pay_items.*.pay_item_id|string',
            'pay_items.*.amount' => 'required|numeric|min:0',
            'pay_items.*.is_taxable' => 'boolean',
            'pay_items.*.is_cnss_applicable' => 'boolean',
        ]);

        $result = $this->service->generateBatchPayslips($request->all(), Auth::id());

        return response()->json($result, 201);
    }

    public function validatePayslip(string $id)
    {
        $result = $this->service->validatePayslip($id);

        return response()->json($result);
    }

    public function lock(string $id)
    {
        $result = $this->service->lockPayslip($id);

        return response()->json($result);
    }

    public function deleteDraft(string $id)
    {
        $result = $this->service->deleteDraftPayslip($id);

        return response()->json($result);
    }

    public function show(string $id)
    {
        $result = $this->service->getPayslipDetails($id);

        return response()->json($result);
    }

    public function getByEmployee(string $employeeId)
    {
        $result = $this->service->getEmployeePayslips($employeeId);

        return response()->json($result);
    }

    public function getByPeriod(Request $request)
    {
        $request->validate([
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        $result = $this->service->getPeriodPayslips($request->period_start, $request->period_end);

        return response()->json($result);
    }
}
