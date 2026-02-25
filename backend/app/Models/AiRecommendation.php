<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiRecommendation extends Model
{
    protected $table = 'ai_recommendations';

    protected $fillable = [
        'job_post_id',
        'utilisateur_id',
        'score',
        'details',
        'generated_at',
    ];

    protected $casts = [
        'score' => 'decimal:2',
        'details' => 'array',
        'generated_at' => 'datetime',
    ];

    public function jobPost()
    {
        return $this->belongsTo(JobPost::class);
    }

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class);
    }
}
