<?php

namespace App\Repositories\Payroll;

use App\Models\FamilyDeductionRule;
use Illuminate\Support\Str;

class FamilyDeductionRuleRepository
{
    public function create(array $data): FamilyDeductionRule
    {
        return FamilyDeductionRule::create([
            'id' => $data['id'] ?? Str::uuid(),
            'rule_set_id' => $data['rule_set_id'],
            'deduction_type' => $data['deduction_type'],
            'annual_amount' => $data['annual_amount'],
            'max_count' => $data['max_count'] ?? null,
        ]);
    }

    public function update(string $id, array $data): FamilyDeductionRule
    {
        $rule = $this->findById($id);
        $rule->update($data);
        return $rule->fresh();
    }

    public function findById(string $id): ?FamilyDeductionRule
    {
        return FamilyDeductionRule::find($id);
    }

    public function findByRuleSet(string $ruleSetId): \Illuminate\Database\Eloquent\Collection
    {
        return FamilyDeductionRule::where('rule_set_id', $ruleSetId)->get();
    }

    public function findByType(string $ruleSetId, string $type): ?FamilyDeductionRule
    {
        return FamilyDeductionRule::where('rule_set_id', $ruleSetId)
            ->byType($type)
            ->first();
    }

    public function delete(string $id): bool
    {
        return FamilyDeductionRule::destroy($id);
    }

    public function deleteByRuleSet(string $ruleSetId): int
    {
        return FamilyDeductionRule::where('rule_set_id', $ruleSetId)->delete();
    }
}
