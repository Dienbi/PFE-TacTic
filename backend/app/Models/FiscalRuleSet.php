<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FiscalRuleSet extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'year',
        'effective_from',
        'effective_to',
        'status',
        'cnss_employee_rate',
        'cnss_employer_rate',
        'cnss_monthly_ceiling',
        'css_rate',
        'css_exempt_annual_net_threshold',
        'prof_expense_rate',
        'prof_expense_annual_cap',
        'min_annual_tax',
        'source_pdf_ref',
        'confirmed_by',
        'confirmed_at',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
        'cnss_employee_rate' => 'decimal:4',
        'cnss_employer_rate' => 'decimal:4',
        'cnss_monthly_ceiling' => 'decimal:3',
        'css_rate' => 'decimal:4',
        'css_exempt_annual_net_threshold' => 'decimal:3',
        'prof_expense_rate' => 'decimal:4',
        'prof_expense_annual_cap' => 'decimal:3',
        'min_annual_tax' => 'decimal:3',
        'confirmed_at' => 'datetime',
    ];

    public function irppBrackets()
    {
        return $this->hasMany(IrppBracket::class, 'rule_set_id');
    }

    public function familyDeductionRules()
    {
        return $this->hasMany(FamilyDeductionRule::class, 'rule_set_id');
    }

    public function confirmedBy()
    {
        return $this->belongsTo(Utilisateur::class, 'confirmed_by');
    }

    public function payslips()
    {
        return $this->hasMany(Payslip::class, 'rule_set_id');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopeActiveForDate($query, $date)
    {
        return $query->where('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $date);
            });
    }
}
