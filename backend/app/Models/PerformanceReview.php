<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PerformanceReview extends Model
{
    use HasFactory;

    protected $table = 'performance_reviews';

    protected $fillable = [
        'utilisateur_id',
        'chef_id',
        'score',
        'message',
        'review_date',
        'review_year',
        'review_month',
    ];

    protected $casts = [
        'score' => 'decimal:1',
        'review_date' => 'date',
    ];

    // Relationships
    public function employee()
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }

    public function chef()
    {
        return $this->belongsTo(Utilisateur::class, 'chef_id');
    }

    // Scopes
    public function scopeForEmployee($query, int $employeeId)
    {
        return $query->where('utilisateur_id', $employeeId);
    }

    public function scopeByChef($query, int $chefId)
    {
        return $query->where('chef_id', $chefId);
    }

    public function scopeLatestForEmployee($query, int $employeeId)
    {
        return $query->where('utilisateur_id', $employeeId)
            ->orderBy('review_date', 'desc')
            ->orderBy('created_at', 'desc');
    }
}
