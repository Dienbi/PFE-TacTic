<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Controller;
use App\Services\Payroll\FiscalRuleManagementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FiscalRuleManagementController extends Controller
{
    private FiscalRuleManagementService $service;

    public function __construct(FiscalRuleManagementService $service)
    {
        $this->service = $service;
    }

    public function createDraft(Request $request)
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
            'effective_from' => 'required|date',
            'effective_to' => 'nullable|date|after:effective_from',
            'cnss_employee_rate' => 'required|numeric|between:0,1',
            'cnss_employer_rate' => 'required|numeric|between:0,1',
            'cnss_monthly_ceiling' => 'nullable|numeric|min:0',
            'css_rate' => 'required|numeric|between:0,1',
            'css_exempt_annual_net_threshold' => 'required|numeric|min:0',
            'prof_expense_rate' => 'required|numeric|between:0,1',
            'prof_expense_annual_cap' => 'required|numeric|min:0',
            'min_annual_tax' => 'required|numeric|min:0',
            'source_pdf_ref' => 'nullable|string',
        ]);

        $result = $this->service->createDraftRuleSet($request->all(), Auth::id());

        return response()->json($result, 201);
    }

    public function updateDraft(Request $request, string $id)
    {
        $request->validate([
            'year' => 'sometimes|integer|min:2020|max:2100',
            'effective_from' => 'sometimes|date',
            'effective_to' => 'nullable|sometimes|date|after:effective_from',
            'cnss_employee_rate' => 'sometimes|numeric|between:0,1',
            'cnss_employer_rate' => 'sometimes|numeric|between:0,1',
            'cnss_monthly_ceiling' => 'nullable|sometimes|numeric|min:0',
            'css_rate' => 'sometimes|numeric|between:0,1',
            'css_exempt_annual_net_threshold' => 'sometimes|numeric|min:0',
            'prof_expense_rate' => 'sometimes|numeric|between:0,1',
            'prof_expense_annual_cap' => 'sometimes|numeric|min:0',
            'min_annual_tax' => 'sometimes|numeric|min:0',
            'source_pdf_ref' => 'nullable|sometimes|string',
        ]);

        $result = $this->service->updateDraftRuleSet($id, $request->all());

        return response()->json($result);
    }

    public function addIrppBracket(Request $request, string $ruleSetId)
    {
        $request->validate([
            'bracket_order' => 'required|integer|min:1',
            'min_annual_amount' => 'required|numeric|min:0',
            'max_annual_amount' => 'nullable|numeric|min:0',
            'rate' => 'required|numeric|between:0,1',
        ]);

        $result = $this->service->addIrppBracket($ruleSetId, $request->all());

        return response()->json($result, 201);
    }

    public function updateIrppBracket(Request $request, string $bracketId)
    {
        $request->validate([
            'bracket_order' => 'sometimes|integer|min:1',
            'min_annual_amount' => 'sometimes|numeric|min:0',
            'max_annual_amount' => 'nullable|sometimes|numeric|min:0',
            'rate' => 'sometimes|numeric|between:0,1',
        ]);

        $result = $this->service->updateIrppBracket($bracketId, $request->all());

        return response()->json($result);
    }

    public function deleteIrppBracket(string $bracketId)
    {
        $result = $this->service->deleteIrppBracket($bracketId);

        return response()->json($result);
    }

    public function addFamilyDeduction(Request $request, string $ruleSetId)
    {
        $request->validate([
            'deduction_type' => 'required|in:head_of_household,child,disabled_child,student_child_non_scholarship',
            'annual_amount' => 'required|numeric|min:0',
            'max_count' => 'nullable|integer|min:1',
        ]);

        $result = $this->service->addFamilyDeduction($ruleSetId, $request->all());

        return response()->json($result, 201);
    }

    public function updateFamilyDeduction(Request $request, string $deductionId)
    {
        $request->validate([
            'annual_amount' => 'sometimes|numeric|min:0',
            'max_count' => 'nullable|sometimes|integer|min:1',
        ]);

        $result = $this->service->updateFamilyDeduction($deductionId, $request->all());

        return response()->json($result);
    }

    public function deleteFamilyDeduction(string $deductionId)
    {
        $result = $this->service->deleteFamilyDeduction($deductionId);

        return response()->json($result);
    }

    public function confirm(Request $request, string $id)
    {
        $result = $this->service->confirmRuleSet($id, Auth::id());

        return response()->json($result);
    }

    public function supersede(string $id)
    {
        $result = $this->service->supersedeRuleSet($id);

        return response()->json($result);
    }

    public function deleteDraft(string $id)
    {
        $result = $this->service->deleteDraftRuleSet($id);

        return response()->json($result);
    }

    public function show(string $id)
    {
        $result = $this->service->getRuleSetWithDetails($id);

        return response()->json($result);
    }

    public function getActive(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
        ]);

        $result = $this->service->getActiveRuleSetForDate($request->date);

        if (!$result) {
            return response()->json(['message' => 'No active rule set found for this date'], 404);
        }

        return response()->json($result);
    }

    public function index()
    {
        $result = $this->service->getAll();

        return response()->json($result);
    }
}
