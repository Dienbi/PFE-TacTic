<?php

namespace App\Enums;

enum EmployeStatus: string
{
    case DISPONIBLE = 'DISPONIBLE';
    case AFFECTE = 'AFFECTE';
    case EN_CONGE = 'EN_CONGE';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
