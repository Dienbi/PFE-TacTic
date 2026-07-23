<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Controller;
use App\Services\Payroll\RuleImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RuleImportController extends Controller
{
    private RuleImportService $service;

    public function __construct(RuleImportService $service)
    {
        $this->service = $service;
    }

    public function uploadPdf(Request $request)
    {
        $request->validate([
            'pdf_file' => 'required|file|mimes:pdf|max:10240',
            'year' => 'required|integer|min:2020|max:2100',
        ]);

        $result = $this->service->uploadPdfForExtraction($request->all(), Auth::id());

        return response()->json($result, 201);
    }

    public function reviewAndConfirm(Request $request, string $importLogId)
    {
        $request->validate([
            'review_decisions' => 'sometimes|array',
        ]);

        $result = $this->service->reviewAndConfirmImport($importLogId, $request->review_decisions ?? [], Auth::id());

        return response()->json($result);
    }

    public function reject(Request $request, string $importLogId)
    {
        $request->validate([
            'reason' => 'required|string',
        ]);

        $result = $this->service->rejectImport($importLogId, $request->reason, Auth::id());

        return response()->json($result);
    }

    public function getPending()
    {
        $result = $this->service->getPendingImports();

        return response()->json($result);
    }

    public function getHistory()
    {
        $result = $this->service->getImportHistory();

        return response()->json($result);
    }

    public function show(string $importLogId)
    {
        $result = $this->service->getImportDetails($importLogId);

        return response()->json($result);
    }
}
