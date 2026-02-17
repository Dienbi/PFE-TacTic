<?php

namespace App\Services;

/**
 * PayrollCalculator Service
 *
 * Handles all payroll calculation logic following Tunisian tax and social security rules.
 * Extracted from Paie model to follow Single Responsibility Principle.
 */
class PayrollCalculator
{
    /**
     * Calculate hourly rate from monthly base salary.
     */
    public function calculateHourlyRate(float $salaireBase): float
    {
        $monthlyHours = config('payroll.standard_monthly_hours', 173);
        return round($salaireBase / $monthlyHours, 2);
    }

    /**
     * Calculate CNSS employee contribution (9.18% of gross).
     */
    public function calculateCNSS(float $salaireBrut): float
    {
        $cnssRate = config('payroll.cnss_rate', 0.0918);
        return round($salaireBrut * $cnssRate, 2);
    }

    /**
     * Calculate annual income tax using progressive brackets.
     * Uses Tunisian IRPP progressive tax system.
     *
     * @param float $revenuAnnuelImposable Annual taxable income (after CNSS)
     * @return float Total annual tax amount
     */
    public function calculateAnnualIncomeTax(float $revenuAnnuelImposable): float
    {
        $taxBrackets = config('payroll.tax_brackets', []);
        $totalTax = 0;

        foreach ($taxBrackets as $bracket) {
            if ($revenuAnnuelImposable <= 0) {
                break;
            }

            // Calculate the width of this tax bracket
            $bracketWidth = $bracket['max'] - $bracket['min'];

            // Tax the minimum of remaining income or bracket width
            $taxableInBracket = min($revenuAnnuelImposable, $bracketWidth);

            if ($taxableInBracket > 0) {
                $totalTax += $taxableInBracket * $bracket['rate'];
                $revenuAnnuelImposable -= $taxableInBracket;
            }
        }

        return round($totalTax, 2);
    }

    public function calculatePayroll(float $salaireBase, float $heuresSupp = 0): array
    {
        $overtimeMultiplier = config('payroll.overtime_multiplier', 1.25);
        $cnssRate = config('payroll.cnss_rate', 0.0918);

        // Calculate gross salary
        $tauxHoraire = $this->calculateHourlyRate($salaireBase);
        $montantHeuresSupp = round($heuresSupp * $tauxHoraire * $overtimeMultiplier, 2);
        $salaireBrut = $salaireBase + $montantHeuresSupp;

        // CNSS on total gross
        $cnss = $this->calculateCNSS($salaireBrut);

        // Annual taxable income = (gross − CNSS) × 12
        $revenuMensuelImposable = $salaireBrut - $cnss;
        $revenuAnnuelImposable = $revenuMensuelImposable * 12;

        // Calculate annual tax and monthly deduction
        $impotAnnuel = $this->calculateAnnualIncomeTax($revenuAnnuelImposable);
        $impotMensuel = round($impotAnnuel / 12, 2);

        // Calculate net salary
        $totalDeductions = $cnss + $impotMensuel;
        $salaireNet = round($salaireBrut - $totalDeductions, 2);

        return [
            'salaire_brut' => $salaireBrut,
            'taux_horaire' => $tauxHoraire,
            'heures_supp' => $heuresSupp,
            'montant_heures_supp' => $montantHeuresSupp,
            'cnss_employe' => $cnss,
            'cnss_taux' => $cnssRate * 100,
            'impot_annuel' => $impotAnnuel,
            'impot_mensuel' => $impotMensuel,
            'deductions' => $totalDeductions,
            'salaire_net' => $salaireNet,
        ];
    }

    /**
     * Simulate payroll for preview purposes.
     * Alias for calculatePayroll for clarity in service layer.
     */
    public function simulate(float $salaireBase, float $heuresSupp = 0): array
    {
        return $this->calculatePayroll($salaireBase, $heuresSupp);
    }
}
