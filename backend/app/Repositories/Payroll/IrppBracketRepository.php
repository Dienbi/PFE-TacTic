<?php

namespace App\Repositories\Payroll;

use App\Models\IrppBracket;
use Illuminate\Support\Str;

class IrppBracketRepository
{
    public function create(array $data): IrppBracket
    {
        return IrppBracket::create([
            'id' => $data['id'] ?? Str::uuid(),
            'rule_set_id' => $data['rule_set_id'],
            'bracket_order' => $data['bracket_order'],
            'min_annual_amount' => $data['min_annual_amount'],
            'max_annual_amount' => $data['max_annual_amount'] ?? null,
            'rate' => $data['rate'],
        ]);
    }

    public function update(string $id, array $data): IrppBracket
    {
        $bracket = $this->findById($id);
        $bracket->update($data);
        return $bracket->fresh();
    }

    public function findById(string $id): ?IrppBracket
    {
        return IrppBracket::find($id);
    }

    public function findByRuleSet(string $ruleSetId): \Illuminate\Database\Eloquent\Collection
    {
        return IrppBracket::where('rule_set_id', $ruleSetId)
            ->ordered()
            ->get();
    }

    public function delete(string $id): bool
    {
        return IrppBracket::destroy($id);
    }

    public function deleteByRuleSet(string $ruleSetId): int
    {
        return IrppBracket::where('rule_set_id', $ruleSetId)->delete();
    }
}
