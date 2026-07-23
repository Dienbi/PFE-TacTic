<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FamilyDeductionRule extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'rule_set_id',
        'deduction_type',
        'annual_amount',
        'max_count',
    ];

    protected $casts = [
        'annual_amount' => 'decimal:3',
    ];

    public function ruleSet()
    {
        return $this->belongsTo(FiscalRuleSet::class, 'rule_set_id');
    }

    public function scopeByType($query, $type)
    {
        return $query->where('deduction_type', $type);
    }
}
