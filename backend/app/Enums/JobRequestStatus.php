<?php

namespace App\Enums;

enum JobRequestStatus: string
{
    case PENDING = 'en_attente';
    case APPROVED = 'approuvee';
    case REJECTED = 'rejetee';

    public function label(): string
    {
        return match($this) {
            self::PENDING => 'En attente',
            self::APPROVED => 'Approuvée',
            self::REJECTED => 'Rejetée',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::PENDING => 'warning',
            self::APPROVED => 'success',
            self::REJECTED => 'danger',
        };
    }
}
