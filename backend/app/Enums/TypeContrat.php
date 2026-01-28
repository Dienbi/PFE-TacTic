<?php

namespace App\Enums;

enum TypeContrat: string
{
    case CDI = 'CDI';
    case CDD = 'CDD';
    case STAGE = 'STAGE';
    case FREELANCE = 'FREELANCE';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
