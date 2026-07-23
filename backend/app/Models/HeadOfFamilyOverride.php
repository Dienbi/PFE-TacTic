<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HeadOfFamilyOverride extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'employee_id',
        'overridden_value',
        'justification_note',
        'document_file_path',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'overridden_value' => 'boolean',
        'approved_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Utilisateur::class, 'employee_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(Utilisateur::class, 'approved_by');
    }

    public function scopeForEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeActive($query)
    {
        return $query->orderBy('approved_at', 'desc')->limit(1);
    }
}
