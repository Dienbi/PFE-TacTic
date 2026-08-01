<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Controller;
use App\Services\Payroll\PayslipCorrectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PayslipCorrectionController extends Controller
{
    private PayslipCorrectionService $service;

    public function __construct(PayslipCorrectionService $service)
    {
        $this->service = $service;
    }

    public function createCorrection(Request $request, string $originalPayslipId)
    {
        $request->validate([
            'reason' => 'required|string',
            'base_salary' => 'nullable|numeric|min:0',
            'pay_items' => 'array',
            'pay_items.*.pay_item_id' => 'nullable|exists:pay_items,id',
            'pay_items.*.name' => 'required_without:pay_items.*.pay_item_id|string',
            'pay_items.*.amount' => 'required|numeric|min:0',
            'pay_items.*.is_taxable' => 'boolean',
            'pay_items.*.is_cnss_applicable' => 'boolean',
            'is_regularization' => 'boolean',
        ]);

        $result = $this->service->createCorrection($originalPayslipId, $request->all(), Auth::id());

        return response()->json($result, 201);
    }

    public function getHistory(string $payslipId)
    {
        $result = $this->service->getCorrectionHistory($payslipId);

        return response()->json($result);
    }

    public function compare(Request $request)
    {
        try {
            $request->validate([
                'payslip_id_1' => 'required|exists:payslips,id',
                'payslip_id_2' => 'required|exists:payslips,id',
            ]);

            \Log::info('Comparing payslips', [
                'payslip_id_1' => $request->payslip_id_1,
                'payslip_id_2' => $request->payslip_id_2,
            ]);

            $result = $this->service->compareVersions($request->payslip_id_1, $request->payslip_id_2);

            \Log::info('Comparison result', ['result' => $result]);

            return response()->json($result);
        } catch (\Exception $e) {
            \Log::error('Comparison error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function revert(Request $request, string $currentPayslipId)
    {
        $request->validate([
            'target_version_id' => 'required|exists:payslips,id',
        ]);

        $result = $this->service->revertToVersion($currentPayslipId, $request->target_version_id, Auth::id());

        return response()->json($result);
    }
}
