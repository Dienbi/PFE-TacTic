<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PersonalInfoChangeRequest extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'employee_id',
        'requested_marital_status',
        'requested_children_count',
        'requested_disabled_children_count',
        'requested_student_children_count',
        'computed_head_of_family_preview',
        'claimed_effective_date',
        'status',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'affects_locked_payslips',
    ];

    protected $casts = [
        'computed_head_of_family_preview' => 'boolean',
        'claimed_effective_date' => 'date',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'affects_locked_payslips' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Utilisateur::class, 'employee_id');
    }

    public function reviewedBy()
    {
        return $this->belongsTo(Utilisateur::class, 'reviewed_by');
    }

    public function documents()
    {
        return $this->hasMany(ChangeRequestDocument::class, 'change_request_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeNeedsMoreInfo($query)
    {
        return $query->where('status', 'needs_more_info');
    }

    public function scopeForEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['pending', 'needs_more_info']);
    }
}
