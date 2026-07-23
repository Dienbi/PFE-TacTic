<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayItem extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'calculation_type',
        'is_taxable',
        'is_cnss_applicable',
        'default_value',
        'active',
    ];

    protected $casts = [
        'default_value' => 'decimal:3',
        'is_taxable' => 'boolean',
        'is_cnss_applicable' => 'boolean',
        'active' => 'boolean',
    ];

    public function payslipPayItems()
    {
        return $this->hasMany(PayslipPayItem::class, 'pay_item_id');
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }
}
