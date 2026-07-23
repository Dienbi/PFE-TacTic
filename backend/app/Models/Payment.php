<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'payslip_id',
        'method',
        'amount',
        'paid_at',
        'reference',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:3',
        'paid_at' => 'date',
    ];

    public function payslip()
    {
        return $this->belongsTo(Payslip::class, 'payslip_id')->with(['employee' => function ($query) {
            $query->withTrashed();
        }]);
    }

    public function createdBy()
    {
        return $this->belongsTo(Utilisateur::class, 'created_by');
    }
}
