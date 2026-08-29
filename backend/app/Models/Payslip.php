<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payslip extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'employee_id',
        'pay_period_start',
        'pay_period_end',
        'rule_set_id',
        'base_salary_used',
        'gross_salary',
        'cnss_employee_amount',
        'cnss_employer_amount',
        'taxable_base_annual',
        'irpp_annual',
        'irpp_monthly',
        'css_amount',
        'family_deduction_total',
        'prof_expense_deduction',
        'net_salary',
        'status',
        'version',
        'supersedes_payslip_id',
        'is_regularization_adjustment',
        'generated_at',
        'generated_by',
    ];

    protected $casts = [
        'pay_period_start' => 'date',
        'pay_period_end' => 'date',
        'base_salary_used' => 'decimal:3',
        'gross_salary' => 'decimal:3',
        'cnss_employee_amount' => 'decimal:3',
        'cnss_employer_amount' => 'decimal:3',
        'taxable_base_annual' => 'decimal:3',
        'irpp_annual' => 'decimal:3',
        'irpp_monthly' => 'decimal:3',
        'css_amount' => 'decimal:3',
        'net_salary' => 'decimal:3',
        'is_regularization_adjustment' => 'boolean',
        'generated_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Utilisateur::class, 'employee_id')->withTrashed();
    }

    public function ruleSet()
    {
        return $this->belongsTo(FiscalRuleSet::class, 'rule_set_id');
    }

    public function generatedBy()
    {
        return $this->belongsTo(Utilisateur::class, 'generated_by');
    }

    public function supersedes()
    {
        return $this->belongsTo(Payslip::class, 'supersedes_payslip_id');
    }

    public function supersededBy()
    {
        return $this->hasMany(Payslip::class, 'supersedes_payslip_id');
    }

    public function payslipPayItems()
    {
        return $this->hasMany(PayslipPayItem::class, 'payslip_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'payslip_id');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeValidated($query)
    {
        return $query->where('status', 'validated');
    }

    public function scopeLocked($query)
    {
        return $query->where('status', 'locked');
    }

    public function scopeLatestVersion($query)
    {
        return $query->where('status', '!=', 'superseded');
    }
}
