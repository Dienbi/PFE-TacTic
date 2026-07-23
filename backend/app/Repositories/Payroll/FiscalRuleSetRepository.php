<?php

namespace App\Repositories\Payroll;

use App\Models\FiscalRuleSet;
use Illuminate\Support\Str;

class FiscalRuleSetRepository
{
    public function create(array $data): FiscalRuleSet
    {
        return FiscalRuleSet::create([
            'id' => $data['id'] ?? Str::uuid(),
            'year' => $data['year'],
            'effective_from' => $data['effective_from'],
            'effective_to' => $data['effective_to'] ?? null,
            'status' => $data['status'] ?? 'draft',
            'cnss_employee_rate' => $data['cnss_employee_rate'],
            'cnss_employer_rate' => $data['cnss_employer_rate'],
            'cnss_monthly_ceiling' => $data['cnss_monthly_ceiling'] ?? null,
            'css_rate' => $data['css_rate'],
            'css_exempt_annual_net_threshold' => $data['css_exempt_annual_net_threshold'],
            'prof_expense_rate' => $data['prof_expense_rate'],
            'prof_expense_annual_cap' => $data['prof_expense_annual_cap'],
            'min_annual_tax' => $data['min_annual_tax'],
            'source_pdf_ref' => $data['source_pdf_ref'] ?? null,
            'confirmed_by' => $data['confirmed_by'] ?? null,
            'confirmed_at' => $data['confirmed_at'] ?? null,
        ]);
    }

    public function update(string $id, array $data): FiscalRuleSet
    {
        $ruleSet = $this->findById($id);
        $ruleSet->update($data);
        return $ruleSet->fresh();
    }

    public function findById(string $id): ?FiscalRuleSet
    {
        return FiscalRuleSet::find($id);
    }

    public function findActiveForDate(string $date): ?FiscalRuleSet
    {
        return FiscalRuleSet::confirmed()
            ->activeForDate($date)
            ->first();
    }

    public function findByYear(int $year): ?FiscalRuleSet
    {
        return FiscalRuleSet::where('year', $year)
            ->confirmed()
            ->first();
    }

    public function getAll(): \Illuminate\Database\Eloquent\Collection
    {
        return FiscalRuleSet::orderBy('year', 'desc')->get();
    }

    public function getConfirmed(): \Illuminate\Database\Eloquent\Collection
    {
        return FiscalRuleSet::confirmed()->orderBy('year', 'desc')->get();
    }

    public function getDrafts(): \Illuminate\Database\Eloquent\Collection
    {
        return FiscalRuleSet::where('status', 'draft')->orderBy('year', 'desc')->get();
    }

    public function confirm(string $id, string $confirmedBy): FiscalRuleSet
    {
        $ruleSet = $this->findById($id);
        
        // Check for overlapping confirmed rule sets
        $this->validateNoOverlap($ruleSet);
        
        $ruleSet->update([
            'status' => 'confirmed',
            'confirmed_by' => $confirmedBy,
            'confirmed_at' => now(),
        ]);
        
        return $ruleSet->fresh();
    }

    public function supersede(string $id): FiscalRuleSet
    {
        $ruleSet = $this->findById($id);
        $ruleSet->update(['status' => 'superseded']);
        return $ruleSet->fresh();
    }

    public function delete(string $id): bool
    {
        $ruleSet = $this->findById($id);
        
        // Only allow deletion of draft rule sets
        if ($ruleSet->status !== 'draft') {
            throw new \Exception('Cannot delete non-draft rule sets');
        }
        
        return $ruleSet->delete();
    }

    private function validateNoOverlap(FiscalRuleSet $ruleSet): void
    {
        $overlapping = FiscalRuleSet::confirmed()
            ->where('year', $ruleSet->year)
            ->where('id', '!=', $ruleSet->id)
            ->where(function ($query) use ($ruleSet) {
                $query->where('effective_from', '<=', $ruleSet->effective_to ?? $ruleSet->effective_from)
                    ->where(function ($q) use ($ruleSet) {
                        $q->whereNull('effective_to')
                            ->orWhere('effective_to', '>=', $ruleSet->effective_from);
                    });
            })
            ->exists();

        if ($overlapping) {
            throw new \Exception('Cannot confirm: overlapping confirmed rule set exists for this period');
        }
    }
}
