<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeFiscalStatusHistory extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'employee_id',
        'marital_status',
        'children_count',
        'disabled_children_count',
        'student_non_scholarship_children_count',
        'head_of_family',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
        'head_of_family' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Utilisateur::class, 'employee_id');
    }

    public function scopeForEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeEffectiveForDate($query, $date)
    {
        return $query->where('effective_from', '<=', $date)
            ->where(function ($q) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', now());
            });
    }

    public function scopeCurrent($query)
    {
        return $query->whereNull('effective_to');
    }
}
