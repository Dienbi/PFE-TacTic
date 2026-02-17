<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Tax Brackets (Annual Income Tax)
    |--------------------------------------------------------------------------
    |
    | Progressive tax brackets for Tunisian IRPP (annual income tax).
    | Each bracket defines cumulative thresholds and marginal rate.
    | 'min' is the start of the bracket, 'max' is the cumulative maximum.
    |
    */
    'tax_brackets' => [
        ['min' => 0,     'max' => 5000,  'rate' => 0.00],
        ['min' => 5000,  'max' => 20000, 'rate' => 0.26],
        ['min' => 20000, 'max' => 30000, 'rate' => 0.28],
        ['min' => 30000, 'max' => 50000, 'rate' => 0.32],
        ['min' => 50000, 'max' => PHP_INT_MAX, 'rate' => 0.35],
    ],

    /*
    |--------------------------------------------------------------------------
    | CNSS Rate
    |--------------------------------------------------------------------------
    |
    | Employee CNSS contribution rate (Tunisian social security).
    | 9.18% of gross salary.
    |
    */
    'cnss_rate' => 0.0918,

    /*
    |--------------------------------------------------------------------------
    | Standard Monthly Hours
    |--------------------------------------------------------------------------
    |
    | Standard monthly working hours for calculating hourly rate.
    | Based on 40 hours/week × 52 weeks ÷ 12 months = 173 hours.
    |
    */
    'standard_monthly_hours' => 173,

    /*
    |--------------------------------------------------------------------------
    | Overtime Multiplier
    |--------------------------------------------------------------------------
    |
    | Overtime pay multiplier (125% of regular hourly rate).
    |
    */
    'overtime_multiplier' => 1.25,
];
