<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RuleImportLog extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'rule_set_id',
        'uploaded_pdf_ref',
        'ai_raw_output_json',
        'proposed_changes_json',
        'reviewed_by',
        'review_decisions_json',
        'status',
    ];

    protected $casts = [
        'ai_raw_output_json' => 'array',
        'proposed_changes_json' => 'array',
        'review_decisions_json' => 'array',
    ];

    public function ruleSet()
    {
        return $this->belongsTo(FiscalRuleSet::class, 'rule_set_id');
    }

    public function reviewedBy()
    {
        return $this->belongsTo(Utilisateur::class, 'reviewed_by');
    }

    public function scopePendingReview($query)
    {
        return $query->where('status', 'pending_review');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }
}
