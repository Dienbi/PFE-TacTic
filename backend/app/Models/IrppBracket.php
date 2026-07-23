<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IrppBracket extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'rule_set_id',
        'bracket_order',
        'min_annual_amount',
        'max_annual_amount',
        'rate',
    ];

    protected $casts = [
        'min_annual_amount' => 'decimal:3',
        'max_annual_amount' => 'decimal:3',
        'rate' => 'decimal:4',
    ];

    public function ruleSet()
    {
        return $this->belongsTo(FiscalRuleSet::class, 'rule_set_id');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('bracket_order');
    }
}
