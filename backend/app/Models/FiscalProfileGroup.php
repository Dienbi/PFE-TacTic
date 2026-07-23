<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FiscalProfileGroup extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'gender',
        'marital_status',
        'head_of_family',
        'children_count',
        'disabled_children_count',
        'student_non_scholarship_children_count',
        'label',
    ];

    protected $casts = [
        'head_of_family' => 'boolean',
    ];

    public function assignments()
    {
        return $this->hasMany(EmployeeFiscalProfileAssignment::class, 'fiscal_profile_group_id');
    }

    public function employees()
    {
        return $this->belongsToMany(Utilisateur::class, 'employee_fiscal_profile_assignments', 'fiscal_profile_group_id', 'employee_id');
    }

    public function scopeByGender($query, $gender)
    {
        return $query->where('gender', $gender);
    }

    public function scopeByMaritalStatus($query, $status)
    {
        return $query->where('marital_status', $status);
    }

    public function scopeHeadOfFamily($query, $isHead = true)
    {
        return $query->where('head_of_family', $isHead);
    }

    public function scopeByChildrenCount($query, $count)
    {
        return $query->where('children_count', $count);
    }
}
