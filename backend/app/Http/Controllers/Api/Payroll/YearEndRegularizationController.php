<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Controller;
use App\Services\Payroll\YearEndRegularizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class YearEndRegularizationController extends Controller
{
    private YearEndRegularizationService $service;

    public function __construct(YearEndRegularizationService $service)
    {
        $this->service = $service;
    }

    public function calculateRegularization(Request $request, string $employeeId)
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
        ]);

        $result = $this->service->calculateAnnualTaxRegularization($employeeId, $request->year, Auth::id());

        return response()->json($result);
    }

    public function createRegularizationPayslip(Request $request, string $employeeId)
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
        ]);

        $result = $this->service->createRegularizationPayslip($employeeId, $request->year, Auth::id());

        return response()->json($result, 201);
    }

    public function batchCalculate(Request $request)
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
        ]);

        $result = $this->service->batchCalculateRegularization($request->year, Auth::id());

        return response()->json($result);
    }

    public function getYearlySummary(Request $request, string $employeeId)
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
        ]);

        $result = $this->service->getYearlySummary($employeeId, $request->year);

        return response()->json($result);
    }

    public function getEmployeesWithRegularizations(Request $request)
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
            'search' => 'nullable|string',
        ]);

        $result = $this->service->getEmployeesWithRegularizations($request->year, $request->search);

        return response()->json($result);
    }
}
