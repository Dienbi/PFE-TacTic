<?php

namespace App\Enums;

enum ApplicationStatus: string
{
    case PENDING = 'en_attente';
    case REVIEWED = 'examinee';
    case ACCEPTED = 'acceptee';
    case REJECTED = 'rejetee';
    case WITHDRAWN = 'retiree';

    public function label(): string
    {
        return match($this) {
            self::PENDING => 'En attente',
            self::REVIEWED => 'Examinée',
            self::ACCEPTED => 'Acceptée',
            self::REJECTED => 'Rejetée',
            self::WITHDRAWN => 'Retirée',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::PENDING => 'warning',
            self::REVIEWED => 'info',
            self::ACCEPTED => 'success',
            self::REJECTED => 'danger',
            self::WITHDRAWN => 'secondary',
        };
    }
}
