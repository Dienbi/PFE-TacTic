<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoleProfile extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'horaire_type',
        'salary_type',
        'weekly_hours',
        'overtime_eligible',
        'overtime_rate_multiplier',
        'base_salary_min',
        'base_salary_max',
        'cnss_regime',
        'label',
    ];

    protected $casts = [
        'overtime_eligible' => 'boolean',
        'weekly_hours' => 'decimal:2',
        'overtime_rate_multiplier' => 'decimal:2',
        'base_salary_min' => 'decimal:3',
        'base_salary_max' => 'decimal:3',
    ];

    public function allowances()
    {
        return $this->hasMany(RoleProfileAllowance::class, 'role_profile_id');
    }

    public function employeeAssignments()
    {
        return $this->hasMany(EmployeeRoleAssignment::class, 'role_profile_id');
    }

    public function employees()
    {
        return $this->belongsToMany(Utilisateur::class, 'employee_role_assignments', 'role_profile_id', 'employee_id')
            ->whereNull('employee_role_assignments.effective_to');
    }

    public function scopeByName($query, $name)
    {
        return $query->where('name', $name);
    }

    public function scopeByHoraireType($query, $type)
    {
        return $query->where('horaire_type', $type);
    }

    public function scopeBySalaryType($query, $type)
    {
        return $query->where('salary_type', $type);
    }
}
