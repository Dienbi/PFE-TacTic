<?php

namespace App\Services\Payroll;

use App\Repositories\Payroll\RuleImportLogRepository;
use App\Repositories\Payroll\FiscalRuleSetRepository;
use App\Repositories\Payroll\IrppBracketRepository;
use App\Repositories\Payroll\FamilyDeductionRuleRepository;
use App\Repositories\Payroll\AuditLogRepository;
use App\Services\AIService;
use Illuminate\Support\Str;

class RuleImportService
{
    private RuleImportLogRepository $importLogRepository;
    private FiscalRuleSetRepository $ruleSetRepository;
    private IrppBracketRepository $bracketRepository;
    private FamilyDeductionRuleRepository $deductionRepository;
    private AuditLogRepository $auditLogRepository;
    private AIService $aiService;

    public function __construct(
        RuleImportLogRepository $importLogRepository,
        FiscalRuleSetRepository $ruleSetRepository,
        IrppBracketRepository $bracketRepository,
        FamilyDeductionRuleRepository $deductionRepository,
        AuditLogRepository $auditLogRepository,
        AIService $aiService
    ) {
        $this->importLogRepository = $importLogRepository;
        $this->ruleSetRepository = $ruleSetRepository;
        $this->bracketRepository = $bracketRepository;
        $this->deductionRepository = $deductionRepository;
        $this->auditLogRepository = $auditLogRepository;
        $this->aiService = $aiService;
    }

    public function uploadPdfForExtraction(array $data, string $uploadedBy): array
    {
        $pdfFile = $data['pdf_file'];
        $year = $data['year'];

        // Store the uploaded file
        $pdfPath = $pdfFile->store('pdfs', 'public');
        $fullPath = storage_path('app/public/' . $pdfPath);

        // Call AI service to extract fiscal rules from PDF
        try {
            $aiResponse = $this->aiService->extractFiscalRules($fullPath);
        } catch (\Exception $e) {
            throw new \Exception('AI extraction failed: ' . $e->getMessage());
        }

        // Create import log entry
        $importLog = $this->importLogRepository->create([
            'uploaded_pdf_ref' => $pdfPath,
            'ai_raw_output_json' => $aiResponse,
            'proposed_changes_json' => $this->parseAiOutputToProposedChanges($aiResponse, $year),
            'status' => 'pending_review',
        ]);

        // Log the import
        $this->auditLogRepository->logRuleImport($uploadedBy, $importLog->id, [
            'pdf_path' => $pdfPath,
            'year' => $year,
        ]);

        return [
            'import_log' => $importLog->fresh(['reviewedBy']),
            'proposed_changes' => $importLog->proposed_changes_json,
            'message' => 'PDF uploaded and AI extraction completed successfully',
        ];
    }

    public function reviewAndConfirmImport(string $importLogId, array $reviewDecisions, string $reviewedBy): array
    {
        $importLog = $this->importLogRepository->findById($importLogId);

        if (!$importLog) {
            throw new \Exception('Import log not found');
        }

        if ($importLog->status !== 'pending_review') {
            throw new \Exception('Import log is not pending review');
        }

        // Merge edited data with original proposed changes
        $finalChanges = array_merge($importLog->proposed_changes_json, $reviewDecisions);

        // Create draft rule set from merged changes
        $ruleSet = $this->createRuleSetFromChanges($finalChanges);

        // Confirm the import log
        $confirmedLog = $this->importLogRepository->confirm($importLogId, $ruleSet->id, $reviewedBy, $reviewDecisions);

        return [
            'import_log' => $confirmedLog->fresh(['ruleSet', 'reviewedBy']),
            'rule_set' => $ruleSet,
            'message' => 'Import reviewed and draft rule set created successfully',
        ];
    }

    public function rejectImport(string $importLogId, string $reason, string $reviewedBy): array
    {
        $importLog = $this->importLogRepository->findById($importLogId);

        if (!$importLog) {
            throw new \Exception('Import log not found');
        }

        $rejectedLog = $this->importLogRepository->reject($importLogId, $reviewedBy, [
            'reason' => $reason,
        ]);

        return [
            'import_log' => $rejectedLog->fresh(['reviewedBy']),
            'message' => 'Import rejected successfully',
        ];
    }

    public function getPendingImports(): array
    {
        $imports = $this->importLogRepository->getPendingReview();

        return [
            'imports' => $imports,
        ];
    }

    public function getImportHistory(): array
    {
        $imports = $this->importLogRepository->getAll();

        return [
            'imports' => $imports,
        ];
    }

    public function getImportDetails(string $importLogId): array
    {
        $importLog = $this->importLogRepository->findById($importLogId);

        if (!$importLog) {
            throw new \Exception('Import log not found');
        }

        return [
            'import_log' => $importLog,
        ];
    }

    private function parseAiOutputToProposedChanges(array $aiOutput, int $year): array
    {
        // Parse AI output into structured proposed changes
        // This is a simplified version - actual implementation would depend on AI service response format
        return [
            'year' => $year,
            'cnss_employee_rate' => $aiOutput['cnss_employee_rate'] ?? null,
            'cnss_employer_rate' => $aiOutput['cnss_employer_rate'] ?? null,
            'cnss_monthly_ceiling' => $aiOutput['cnss_monthly_ceiling'] ?? null,
            'css_rate' => $aiOutput['css_rate'] ?? null,
            'css_exempt_annual_net_threshold' => $aiOutput['css_exempt_threshold'] ?? null,
            'prof_expense_rate' => $aiOutput['prof_expense_rate'] ?? null,
            'prof_expense_annual_cap' => $aiOutput['prof_expense_cap'] ?? null,
            'min_annual_tax' => $aiOutput['min_annual_tax'] ?? null,
            'irpp_brackets' => $aiOutput['irpp_brackets'] ?? [],
            'family_deductions' => $aiOutput['family_deductions'] ?? [],
        ];
    }

    private function filterApprovedChanges(array $proposedChanges, array $reviewDecisions): array
    {
        // Filter changes based on review decisions
        $approved = [];

        foreach ($proposedChanges as $key => $value) {
            if (isset($reviewDecisions[$key]) && $reviewDecisions[$key] === 'approved') {
                $approved[$key] = $value;
            }
        }

        return $approved;
    }

    private function createRuleSetFromChanges(array $changes): \App\Models\FiscalRuleSet
    {
        // Create draft rule set
        $ruleSet = $this->ruleSetRepository->create([
            'year' => $changes['year'],
            'effective_from' => "{$changes['year']}-01-01",
            'effective_to' => null,
            'status' => 'draft',
            'cnss_employee_rate' => $changes['cnss_employee_rate'] ?? 0,
            'cnss_employer_rate' => $changes['cnss_employer_rate'] ?? 0,
            'cnss_monthly_ceiling' => $changes['cnss_monthly_ceiling'] ?? null,
            'css_rate' => $changes['css_rate'] ?? 0,
            'css_exempt_annual_net_threshold' => $changes['css_exempt_annual_net_threshold'] ?? 0,
            'prof_expense_rate' => $changes['prof_expense_rate'] ?? 0,
            'prof_expense_annual_cap' => $changes['prof_expense_annual_cap'] ?? 0,
            'min_annual_tax' => $changes['min_annual_tax'] ?? 0,
            'source_pdf_ref' => $changes['source_pdf_ref'] ?? null,
        ]);

        // Create IRPP brackets if provided
        if (isset($changes['irpp_brackets'])) {
            foreach ($changes['irpp_brackets'] as $index => $bracket) {
                $this->bracketRepository->create([
                    'rule_set_id' => $ruleSet->id,
                    'bracket_order' => $index + 1,
                    'min_annual_amount' => $bracket['min'] ?? 0,
                    'max_annual_amount' => $bracket['max'] ?? null,
                    'rate' => $bracket['rate'] ?? 0,
                ]);
            }
        }

        // Create family deductions if provided
        if (isset($changes['family_deductions'])) {
            foreach ($changes['family_deductions'] as $deduction) {
                $this->deductionRepository->create([
                    'rule_set_id' => $ruleSet->id,
                    'deduction_type' => $deduction['type'],
                    'annual_amount' => $deduction['amount'] ?? 0,
                    'max_count' => $deduction['max_count'] ?? null,
                ]);
            }
        }

        return $ruleSet->fresh(['irppBrackets', 'familyDeductionRules']);
    }
}
