<?php

namespace App\Enums;

enum StatutConge: string
{
    case EN_ATTENTE = 'EN_ATTENTE';
    case APPROUVE = 'APPROUVE';
    case REFUSE = 'REFUSE';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
