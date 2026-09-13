<?php

namespace App\Repositories\Payroll;

use App\Models\RuleImportLog;
use Illuminate\Support\Str;

class RuleImportLogRepository
{
    public function create(array $data): RuleImportLog
    {
        return RuleImportLog::create([
            'id' => $data['id'] ?? Str::uuid(),
            'rule_set_id' => $data['rule_set_id'] ?? null,
            'uploaded_pdf_ref' => $data['uploaded_pdf_ref'],
            'ai_raw_output_json' => $data['ai_raw_output_json'],
            'proposed_changes_json' => $data['proposed_changes_json'],
            'reviewed_by' => $data['reviewed_by'] ?? null,
            'review_decisions_json' => $data['review_decisions_json'] ?? null,
            'status' => $data['status'] ?? 'pending_review',
        ]);
    }

    public function update(string $id, array $data): RuleImportLog
    {
        $log = $this->findById($id);
        $log->update($data);
        return $log->fresh();
    }

    public function findById(string $id): ?RuleImportLog
    {
        return RuleImportLog::with(['ruleSet', 'reviewedBy'])->find($id);
    }

    public function getAll(): \Illuminate\Database\Eloquent\Collection
    {
        return RuleImportLog::with(['ruleSet', 'reviewedBy'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getPendingReview(): \Illuminate\Database\Eloquent\Collection
    {
        return RuleImportLog::pendingReview()
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function confirm(string $id, string $ruleSetId, string $reviewedBy, array $decisions): RuleImportLog
    {
        $log = $this->findById($id);

        $log->update([
            'rule_set_id' => $ruleSetId,
            'reviewed_by' => $reviewedBy,
            'review_decisions_json' => $decisions,
            'status' => 'confirmed',
        ]);

        return $log->fresh();
    }

    public function reject(string $id, string $reviewedBy, array $decisions): RuleImportLog
    {
        $log = $this->findById($id);

        $log->update([
            'reviewed_by' => $reviewedBy,
            'review_decisions_json' => $decisions,
            'status' => 'rejected',
        ]);

        return $log->fresh();
    }

    public function delete(string $id): bool
    {
        return RuleImportLog::destroy($id);
    }
}
