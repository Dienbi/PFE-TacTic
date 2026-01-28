<?php

namespace App\Enums;

enum Role: string
{
    case RH = 'RH';
    case CHEF_EQUIPE = 'CHEF_EQUIPE';
    case EMPLOYE = 'EMPLOYE';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
