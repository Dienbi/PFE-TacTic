<?php

namespace App\Services\Payroll;

/**
 * PayrollCalculationEngine
 *
 * Pure function service for Tunisian payroll calculations.
 * Follows Single Responsibility Principle - only calculates payroll.
 * No database dependencies - takes plain data in, returns plain data out.
 * Unit-testable with fixed inputs/outputs.
 */
class PayrollCalculationEngine
{
    /**
     * Calculate payslip according to Tunisian tax rules.
     *
     * @param array $input {
     *   baseSalary: float,
     *   payItems: array [{ amount, isTaxable, isCnssApplicable }],
     *   fiscalProfile: { maritalStatus, childrenCount, disabledChildrenCount, studentChildrenCount },
     *   ruleSet: {
     *     cnssEmployeeRate, cnssEmployerRate, cssRate, cssExemptThreshold,
     *     profExpenseRate, profExpenseCap, minAnnualTax,
     *     irppBrackets: [{ min, max, rate }],
     *     familyDeductions: [{ type, amount, maxCount }]
     *   },
     *   payPeriodMonths: int (default 1)
     * }
     *
     * @return array {
     *   grossSalary, cnssEmployeeAmount, cnssEmployerAmount,
     *   taxableBaseAnnual, irppAnnual, irppMonthly, cssAmount, netSalary,
     *   profExpenseDeduction, familyDeductionTotal
     * }
     */
    public function calculatePayslip(array $input): array
    {
        $baseSalary = $input['baseSalary'];
        $payItems = $input['payItems'] ?? [];
        $fiscalProfile = $input['fiscalProfile'] ?? [];
        $ruleSet = $input['ruleSet'];
        $payPeriodMonths = $input['payPeriodMonths'] ?? 1;

        // Step 1: Calculate gross salary
        $grossSalary = $baseSalary + $this->sumPayItems($payItems);

        // Step 2: Calculate CNSS-applicable gross
        $cnssApplicableGross = $baseSalary + $this->sumPayItemsByFlag($payItems, 'isCnssApplicable');

        // Step 3: Calculate CNSS employee amount
        $cnssEmployeeAmount = $this->roundCurrency(
            $cnssApplicableGross * $ruleSet['cnssEmployeeRate']
        );

        // Step 4: Calculate CNSS employer amount
        $cnssEmployerAmount = $this->roundCurrency(
            $cnssApplicableGross * $ruleSet['cnssEmployerRate']
        );

        // Step 5: Calculate taxable gross
        $taxableGross = $baseSalary + $this->sumPayItemsByFlag($payItems, 'isTaxable');

        // Step 6: Calculate net before tax (taxable gross - CNSS employee)
        $netBeforeTax = $taxableGross - $cnssEmployeeAmount;

        // Step 7: Annualize based on months worked
        $annualNetBeforeTax = $netBeforeTax * (12 / $payPeriodMonths);

        // Step 8: Calculate professional expense deduction
        $profExpenseDeduction = min(
            $this->roundCurrency($annualNetBeforeTax * $ruleSet['profExpenseRate']),
            $ruleSet['profExpenseCap']
        );

        // Step 9: Calculate family deduction total
        $familyDeductionTotal = $this->calculateFamilyDeduction(
            $fiscalProfile,
            $ruleSet['familyDeductions']
        );

        // Step 10: Calculate annual taxable base
        $annualTaxableBase = max(0, $annualNetBeforeTax - $profExpenseDeduction - $familyDeductionTotal);

        // Step 11: Apply progressive IRPP brackets
        $irppAnnual = $this->calculateProgressiveTax($annualTaxableBase, $ruleSet['irppBrackets']);

        // Apply minimum annual tax floor
        $irppAnnual = max($irppAnnual, $ruleSet['minAnnualTax']);

        // Step 12: Calculate monthly IRPP
        $irppMonthly = $this->roundCurrency($irppAnnual / 12);

        // Step 13: Calculate CSS amount
        $cssAmount = ($annualNetBeforeTax > $ruleSet['cssExemptThreshold'])
            ? $this->roundCurrency($netBeforeTax * $ruleSet['cssRate'])
            : 0;

        // Step 14: Calculate net salary
        $netSalary = $this->roundCurrency(
            $grossSalary - $cnssEmployeeAmount - $irppMonthly - $cssAmount
        );

        return [
            'gross_salary' => $this->roundCurrency($grossSalary),
            'cnss_employee_amount' => $cnssEmployeeAmount,
            'cnss_employer_amount' => $cnssEmployerAmount,
            'taxable_base_annual' => $this->roundCurrency($annualTaxableBase),
            'irpp_annual' => $this->roundCurrency($irppAnnual),
            'irpp_monthly' => $irppMonthly,
            'css_amount' => $cssAmount,
            'net_salary' => $netSalary,
            'prof_expense_deduction' => $profExpenseDeduction,
            'family_deduction_total' => $familyDeductionTotal,
        ];
    }

    /**
     * Sum all pay item amounts.
     */
    private function sumPayItems(array $payItems): float
    {
        return array_reduce($payItems, function ($carry, $item) {
            return $carry + ($item['amount'] ?? 0);
        }, 0);
    }

    /**
     * Sum pay items by specific flag (isTaxable or isCnssApplicable).
     */
    private function sumPayItemsByFlag(array $payItems, string $flag): float
    {
        return array_reduce($payItems, function ($carry, $item) use ($flag) {
            if (($item[$flag] ?? false) === true) {
                return $carry + ($item['amount'] ?? 0);
            }
            return $carry;
        }, 0);
    }

    /**
     * Calculate family deduction based on fiscal profile.
     */
    private function calculateFamilyDeduction(array $profile, array $deductions): float
    {
        $total = 0.0;
        $maritalStatus = $profile['maritalStatus'] ?? 'single';
        $childrenCount = $profile['childrenCount'] ?? 0;
        $disabledChildrenCount = $profile['disabledChildrenCount'] ?? 0;
        $studentChildrenCount = $profile['studentChildrenCount'] ?? 0;

        foreach ($deductions as $deduction) {
            $amount = $deduction['amount'] ?? 0;
            $maxCount = $deduction['maxCount'];
            $type = $deduction['type'];

            switch ($type) {
                case 'head_of_household':
                    if ($maritalStatus === 'head_of_household') {
                        $total += $amount;
                    }
                    break;

                case 'child':
                    $count = min($childrenCount, $maxCount ?? PHP_INT_MAX);
                    $total += $amount * $count;
                    break;

                case 'disabled_child':
                    $total += $amount * $disabledChildrenCount;
                    break;

                case 'student_child_non_scholarship':
                    $total += $amount * $studentChildrenCount;
                    break;
            }
        }

        return $this->roundCurrency($total);
    }

    /**
     * Calculate progressive tax using IRPP brackets.
     */
    private function calculateProgressiveTax(float $annualTaxableBase, array $brackets): float
    {
        $totalTax = 0.0;
        $remainingIncome = $annualTaxableBase;

        // Sort brackets by min amount
        usort($brackets, function ($a, $b) {
            return ($a['min'] ?? 0) <=> ($b['min'] ?? 0);
        });

        foreach ($brackets as $bracket) {
            if ($remainingIncome <= 0) {
                break;
            }

            $min = $bracket['min'] ?? 0;
            $max = $bracket['max'] ?? PHP_INT_MAX;
            $rate = $bracket['rate'] ?? 0;

            // Calculate taxable amount in this bracket
            $bracketWidth = $max - $min;
            $taxableInBracket = min($remainingIncome, $bracketWidth);

            if ($taxableInBracket > 0) {
                $totalTax += $taxableInBracket * $rate;
                $remainingIncome -= $taxableInBracket;
            }
        }

        return $this->roundCurrency($totalTax);
    }

    /**
     * Round currency to 3 decimal places (millimes).
     * Applied consistently throughout calculations.
     */
    private function roundCurrency(float $amount): float
    {
        return round($amount, 3);
    }
}
