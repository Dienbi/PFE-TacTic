<?php

namespace App\Enums;

enum StatutPaie: string
{
    case GENERE = 'GENERE';
    case VALIDE = 'VALIDE';
    case PAYE = 'PAYE';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
