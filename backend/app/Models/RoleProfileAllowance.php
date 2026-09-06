<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoleProfileAllowance extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'role_profile_id',
        'allowance_type',
        'amount',
        'is_percentage',
    ];

    protected $casts = [
        'amount' => 'decimal:3',
        'is_percentage' => 'boolean',
    ];

    public function roleProfile()
    {
        return $this->belongsTo(RoleProfile::class, 'role_profile_id');
    }
}
