<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeFiscalProfile extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'employee_id',
        'effective_from',
        'marital_status',
        'children_count',
        'disabled_children_count',
        'student_non_scholarship_children_count',
    ];

    protected $casts = [
        'effective_from' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Utilisateur::class, 'employee_id');
    }

    public function scopeEffectiveForDate($query, $date)
    {
        return $query->where('effective_from', '<=', $date)
            ->orderBy('effective_from', 'desc')
            ->limit(1);
    }
}
