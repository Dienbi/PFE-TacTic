<?php

namespace App\Enums;

enum TypeConge: string
{
    case ANNUEL = 'ANNUEL';
    case MALADIE = 'MALADIE';
    case SANS_SOLDE = 'SANS_SOLDE';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
