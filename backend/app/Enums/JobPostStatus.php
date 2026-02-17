<?php

namespace App\Enums;

enum JobPostStatus: string
{
    case DRAFT = 'brouillon';
    case PUBLISHED = 'publiee';
    case CLOSED = 'fermee';

    public function label(): string
    {
        return match($this) {
            self::DRAFT => 'Brouillon',
            self::PUBLISHED => 'Publiée',
            self::CLOSED => 'Fermée',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::DRAFT => 'secondary',
            self::PUBLISHED => 'success',
            self::CLOSED => 'danger',
        };
    }
}
