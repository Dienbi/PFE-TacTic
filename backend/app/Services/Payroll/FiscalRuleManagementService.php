<?php

namespace App\Services\Payroll;

use App\Repositories\Payroll\FiscalRuleSetRepository;
use App\Repositories\Payroll\IrppBracketRepository;
use App\Repositories\Payroll\FamilyDeductionRuleRepository;
use App\Repositories\Payroll\AuditLogRepository;
use Illuminate\Support\Str;

class FiscalRuleManagementService
{
    private FiscalRuleSetRepository $ruleSetRepository;
    private IrppBracketRepository $bracketRepository;
    private FamilyDeductionRuleRepository $deductionRepository;
    private AuditLogRepository $auditLogRepository;

    public function __construct(
        FiscalRuleSetRepository $ruleSetRepository,
        IrppBracketRepository $bracketRepository,
        FamilyDeductionRuleRepository $deductionRepository,
        AuditLogRepository $auditLogRepository
    ) {
        $this->ruleSetRepository = $ruleSetRepository;
        $this->bracketRepository = $bracketRepository;
        $this->deductionRepository = $deductionRepository;
        $this->auditLogRepository = $auditLogRepository;
    }

    public function getAll(): array
    {
        $ruleSets = $this->ruleSetRepository->getAll();
        
        return [
            'rule_sets' => $ruleSets,
        ];
    }

    public function createDraftRuleSet(array $data, string $actorId): array
    {
        $ruleSet = $this->ruleSetRepository->create(array_merge($data, [
            'status' => 'draft',
        ]));

        return [
            'rule_set' => $ruleSet,
            'message' => 'Draft rule set created successfully',
        ];
    }

    public function updateDraftRuleSet(string $ruleSetId, array $data): array
    {
        $ruleSet = $this->ruleSetRepository->findById($ruleSetId);
        
        if ($ruleSet->status !== 'draft') {
            throw new \Exception('Only draft rule sets can be updated');
        }

        $updated = $this->ruleSetRepository->update($ruleSetId, $data);

        return [
            'rule_set' => $updated,
            'message' => 'Draft rule set updated successfully',
        ];
    }

    public function addIrppBracket(string $ruleSetId, array $bracketData): array
    {
        $ruleSet = $this->ruleSetRepository->findById($ruleSetId);
        
        if ($ruleSet->status !== 'draft') {
            throw new \Exception('Brackets can only be added to draft rule sets');
        }

        $bracket = $this->bracketRepository->create(array_merge($bracketData, [
            'rule_set_id' => $ruleSetId,
        ]));

        return [
            'bracket' => $bracket,
            'message' => 'IRPP bracket added successfully',
        ];
    }

    public function updateIrppBracket(string $bracketId, array $data): array
    {
        $bracket = $this->bracketRepository->findById($bracketId);
        $ruleSet = $this->ruleSetRepository->findById($bracket->rule_set_id);
        
        if ($ruleSet->status !== 'draft') {
            throw new \Exception('Brackets can only be updated in draft rule sets');
        }

        $updated = $this->bracketRepository->update($bracketId, $data);

        return [
            'bracket' => $updated,
            'message' => 'IRPP bracket updated successfully',
        ];
    }

    public function deleteIrppBracket(string $bracketId): array
    {
        $bracket = $this->bracketRepository->findById($bracketId);
        $ruleSet = $this->ruleSetRepository->findById($bracket->rule_set_id);
        
        if ($ruleSet->status !== 'draft') {
            throw new \Exception('Brackets can only be deleted from draft rule sets');
        }

        $this->bracketRepository->delete($bracketId);

        return [
            'message' => 'IRPP bracket deleted successfully',
        ];
    }

    public function addFamilyDeduction(string $ruleSetId, array $deductionData): array
    {
        $ruleSet = $this->ruleSetRepository->findById($ruleSetId);
        
        if ($ruleSet->status !== 'draft') {
            throw new \Exception('Deductions can only be added to draft rule sets');
        }

        $deduction = $this->deductionRepository->create(array_merge($deductionData, [
            'rule_set_id' => $ruleSetId,
        ]));

        return [
            'deduction' => $deduction,
            'message' => 'Family deduction added successfully',
        ];
    }

    public function updateFamilyDeduction(string $deductionId, array $data): array
    {
        $deduction = $this->deductionRepository->findById($deductionId);
        $ruleSet = $this->ruleSetRepository->findById($deduction->rule_set_id);
        
        if ($ruleSet->status !== 'draft') {
            throw new \Exception('Deductions can only be updated in draft rule sets');
        }

        $updated = $this->deductionRepository->update($deductionId, $data);

        return [
            'deduction' => $updated,
            'message' => 'Family deduction updated successfully',
        ];
    }

    public function deleteFamilyDeduction(string $deductionId): array
    {
        $deduction = $this->deductionRepository->findById($deductionId);
        $ruleSet = $this->ruleSetRepository->findById($deduction->rule_set_id);
        
        if ($ruleSet->status !== 'draft') {
            throw new \Exception('Deductions can only be deleted from draft rule sets');
        }

        $this->deductionRepository->delete($deductionId);

        return [
            'message' => 'Family deduction deleted successfully',
        ];
    }

    public function confirmRuleSet(string $ruleSetId, string $actorId): array
    {
        $ruleSet = $this->ruleSetRepository->findById($ruleSetId);
        
        if ($ruleSet->status !== 'draft') {
            throw new \Exception('Only draft rule sets can be confirmed');
        }

        // Validate required fields
        $this->validateRuleSetForConfirmation($ruleSet);

        // Confirm the rule set
        $confirmed = $this->ruleSetRepository->confirm($ruleSetId, $actorId);

        // Log the action
        $this->auditLogRepository->logRuleSetConfirmation($actorId, $ruleSetId, [
            'year' => $ruleSet->year,
            'effective_from' => $ruleSet->effective_from,
        ]);

        return [
            'rule_set' => $confirmed,
            'message' => 'Rule set confirmed successfully',
        ];
    }

    public function supersedeRuleSet(string $ruleSetId): array
    {
        $superseded = $this->ruleSetRepository->supersede($ruleSetId);

        return [
            'rule_set' => $superseded,
            'message' => 'Rule set superseded successfully',
        ];
    }

    public function deleteDraftRuleSet(string $ruleSetId): array
    {
        $ruleSet = $this->ruleSetRepository->findById($ruleSetId);
        
        if ($ruleSet->status !== 'draft') {
            throw new \Exception('Only draft rule sets can be deleted');
        }

        $this->ruleSetRepository->delete($ruleSetId);

        return [
            'message' => 'Draft rule set deleted successfully',
        ];
    }

    public function getRuleSetWithDetails(string $ruleSetId): array
    {
        $ruleSet = $this->ruleSetRepository->findById($ruleSetId);
        $brackets = $this->bracketRepository->findByRuleSet($ruleSetId);
        $deductions = $this->deductionRepository->findByRuleSet($ruleSetId);

        return [
            'rule_set' => $ruleSet,
            'brackets' => $brackets,
            'deductions' => $deductions,
        ];
    }

    public function getActiveRuleSetForDate(string $date): ?array
    {
        $ruleSet = $this->ruleSetRepository->findActiveForDate($date);
        
        if (!$ruleSet) {
            return null;
        }

        return $this->getRuleSetWithDetails($ruleSet->id);
    }

    private function validateRuleSetForConfirmation($ruleSet): void
    {
        // Check for at least one IRPP bracket
        $brackets = $this->bracketRepository->findByRuleSet($ruleSet->id);
        if ($brackets->isEmpty()) {
            throw new \Exception('Rule set must have at least one IRPP bracket');
        }

        // Validate bracket order
        $expectedOrder = 1;
        foreach ($brackets->sortBy('bracket_order') as $bracket) {
            if ($bracket->bracket_order !== $expectedOrder) {
                throw new \Exception('IRPP brackets must have sequential order starting from 1');
            }
            $expectedOrder++;
        }

        // Check for gaps in brackets
        $bracketsArray = $brackets->sortBy('bracket_order')->values()->toArray();
        for ($i = 0; $i < count($bracketsArray) - 1; $i++) {
            if ($bracketsArray[$i]['max_annual_amount'] !== $bracketsArray[$i + 1]['min_annual_amount']) {
                throw new \Exception('IRPP brackets must be contiguous (max of one bracket must equal min of next)');
            }
        }

        // Validate required fields
        if (!$ruleSet->cnss_employee_rate || !$ruleSet->cnss_employer_rate) {
            throw new \Exception('CNSS rates are required');
        }

        if (!$ruleSet->css_rate) {
            throw new \Exception('CSS rate is required');
        }

        if (!$ruleSet->prof_expense_rate || !$ruleSet->prof_expense_annual_cap) {
            throw new \Exception('Professional expense settings are required');
        }

        if (!$ruleSet->min_annual_tax) {
            throw new \Exception('Minimum annual tax is required');
        }
    }
}
