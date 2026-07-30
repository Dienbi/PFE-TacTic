<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeFiscalProfileAssignment extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'employee_id',
        'fiscal_profile_group_id',
        'effective_from',
        'effective_to',
        'assigned_by',
        'assigned_at',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
        'assigned_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Utilisateur::class, 'employee_id');
    }

    public function fiscalProfileGroup()
    {
        return $this->belongsTo(FiscalProfileGroup::class, 'fiscal_profile_group_id');
    }

    public function assignedBy()
    {
        return $this->belongsTo(Utilisateur::class, 'assigned_by');
    }

    public function scopeActiveForDate($query, $date)
    {
        return $query->where('effective_from', '<=', $date)
            ->where(function ($q) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', now());
            });
    }

    public function scopeForEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeCurrent($query)
    {
        return $query->whereNull('effective_to');
    }

    public function scopeHistorical($query)
    {
        return $query->whereNotNull('effective_to');
    }
}
