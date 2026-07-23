<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayslipPayItem extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'payslip_id',
        'pay_item_id',
        'name_snapshot',
        'amount',
        'was_taxable',
        'was_cnss_applicable',
    ];

    protected $casts = [
        'amount' => 'decimal:3',
        'was_taxable' => 'boolean',
        'was_cnss_applicable' => 'boolean',
    ];

    public function payslip()
    {
        return $this->belongsTo(Payslip::class, 'payslip_id');
    }

    public function payItem()
    {
        return $this->belongsTo(PayItem::class, 'pay_item_id');
    }
}
