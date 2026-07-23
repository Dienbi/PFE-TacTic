<?php

namespace Tests\Unit\Services\Payroll;

use App\Services\Payroll\PayrollCalculationEngine;
use Tests\TestCase;

class PayrollCalculationEngineTest extends TestCase
{
    private PayrollCalculationEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new PayrollCalculationEngine();
    }

    /**
     * Test low salary scenario (below first bracket).
     */
    public function test_low_salary_calculation(): void
    {
        $input = [
            'baseSalary' => 400.000,
            'payItems' => [],
            'fiscalProfile' => [
                'maritalStatus' => 'single',
                'childrenCount' => 0,
                'disabledChildrenCount' => 0,
                'studentChildrenCount' => 0,
            ],
            'ruleSet' => $this->get2026RuleSet(),
            'payPeriodMonths' => 1,
        ];

        $result = $this->engine->calculatePayslip($input);

        // Gross salary = base salary (no pay items)
        $this->assertEquals(400.000, $result['gross_salary']);

        // CNSS employee = 400 * 0.0968 = 38.720
        $this->assertEquals(38.720, $result['cnss_employee_amount']);

        // CNSS employer = 400 * 0.1707 = 68.280
        $this->assertEquals(68.280, $result['cnss_employer_amount']);

        // Annual taxable base should be calculated correctly
        $this->assertGreaterThan(0, $result['taxable_base_annual']);

        // IRPP should be at minimum annual tax floor (45.000 / 12 = 3.750)
        $this->assertEquals(3.750, $result['irpp_monthly']);

        // Net salary should be positive
        $this->assertGreaterThan(0, $result['net_salary']);
    }

    /**
     * Test mid salary scenario (multiple brackets).
     */
    public function test_mid_salary_calculation(): void
    {
        $input = [
            'baseSalary' => 1500.000,
            'payItems' => [
                ['amount' => 200.000, 'isTaxable' => true, 'isCnssApplicable' => true],
            ],
            'fiscalProfile' => [
                'maritalStatus' => 'single',
                'childrenCount' => 0,
                'disabledChildrenCount' => 0,
                'studentChildrenCount' => 0,
            ],
            'ruleSet' => $this->get2026RuleSet(),
            'payPeriodMonths' => 1,
        ];

        $result = $this->engine->calculatePayslip($input);

        // Gross salary = 1500 + 200 = 1700
        $this->assertEquals(1700.000, $result['gross_salary']);

        // CNSS employee = 1700 * 0.0968 = 164.560
        $this->assertEquals(164.560, $result['cnss_employee_amount']);

        // Should fall into progressive tax brackets
        $this->assertGreaterThan(0, $result['irpp_monthly']);

        // Net salary should be less than gross
        $this->assertLessThan($result['gross_salary'], $result['net_salary']);
    }

    /**
     * Test high salary with head of household and children.
     */
    public function test_high_salary_with_family_deductions(): void
    {
        $input = [
            'baseSalary' => 5000.000,
            'payItems' => [
                ['amount' => 500.000, 'isTaxable' => true, 'isCnssApplicable' => true],
            ],
            'fiscalProfile' => [
                'maritalStatus' => 'head_of_household',
                'childrenCount' => 2,
                'disabledChildrenCount' => 0,
                'studentChildrenCount' => 0,
            ],
            'ruleSet' => $this->get2026RuleSet(),
            'payPeriodMonths' => 1,
        ];

        $result = $this->engine->calculatePayslip($input);

        // Gross salary = 5000 + 500 = 5500
        $this->assertEquals(5500.000, $result['gross_salary']);

        // Family deduction should include head of household (300) + 2 children (2 * 100 = 200)
        $this->assertEquals(500.000, $result['family_deduction_total']);

        // Professional expense deduction should be capped at 2000
        $this->assertLessThanOrEqual(2000.000, $result['prof_expense_deduction']);

        // Should have significant IRPP due to high salary
        $this->assertGreaterThan(0, $result['irpp_monthly']);
    }

    /**
     * Test CSS exemption for low income.
     */
    public function test_css_exemption_for_low_income(): void
    {
        $input = [
            'baseSalary' => 300.000,
            'payItems' => [],
            'fiscalProfile' => [
                'maritalStatus' => 'single',
                'childrenCount' => 0,
                'disabledChildrenCount' => 0,
                'studentChildrenCount' => 0,
            ],
            'ruleSet' => $this->get2026RuleSet(),
            'payPeriodMonths' => 1,
        ];

        $result = $this->engine->calculatePayslip($input);

        // CSS should be 0 for low income (below 5000 annual threshold)
        $this->assertEquals(0, $result['css_amount']);
    }

    /**
     * Test CSS application for high income.
     */
    public function test_css_application_for_high_income(): void
    {
        $input = [
            'baseSalary' => 1000.000,
            'payItems' => [],
            'fiscalProfile' => [
                'maritalStatus' => 'single',
                'childrenCount' => 0,
                'disabledChildrenCount' => 0,
                'studentChildrenCount' => 0,
            ],
            'ruleSet' => $this->get2026RuleSet(),
            'payPeriodMonths' => 1,
        ];

        $result = $this->engine->calculatePayslip($input);

        // CSS should be applied for income above threshold
        $this->assertGreaterThan(0, $result['css_amount']);
    }

    /**
     * Test disabled children deduction (no max count).
     */
    public function test_disabled_children_deduction(): void
    {
        $input = [
            'baseSalary' => 2000.000,
            'payItems' => [],
            'fiscalProfile' => [
                'maritalStatus' => 'single',
                'childrenCount' => 0,
                'disabledChildrenCount' => 3,
                'studentChildrenCount' => 0,
            ],
            'ruleSet' => $this->get2026RuleSet(),
            'payPeriodMonths' => 1,
        ];

        $result = $this->engine->calculatePayslip($input);

        // Should include 3 disabled children deductions (3 * 2000 = 6000)
        $this->assertEquals(6000.000, $result['family_deduction_total']);
    }

    /**
     * Test children count max limit.
     */
    public function test_children_count_max_limit(): void
    {
        $input = [
            'baseSalary' => 2000.000,
            'payItems' => [],
            'fiscalProfile' => [
                'maritalStatus' => 'single',
                'childrenCount' => 6, // Exceeds max of 4
                'disabledChildrenCount' => 0,
                'studentChildrenCount' => 0,
            ],
            'ruleSet' => $this->get2026RuleSet(),
            'payPeriodMonths' => 1,
        ];

        $result = $this->engine->calculatePayslip($input);

        // Should only deduct for 4 children (max limit)
        $this->assertEquals(400.000, $result['family_deduction_total']);
    }

    /**
     * Test pay items with different flags.
     */
    public function test_pay_items_with_different_flags(): void
    {
        $input = [
            'baseSalary' => 1000.000,
            'payItems' => [
                ['amount' => 100.000, 'isTaxable' => true, 'isCnssApplicable' => true],
                ['amount' => 50.000, 'isTaxable' => false, 'isCnssApplicable' => true],
                ['amount' => 75.000, 'isTaxable' => true, 'isCnssApplicable' => false],
            ],
            'fiscalProfile' => [
                'maritalStatus' => 'single',
                'childrenCount' => 0,
                'disabledChildrenCount' => 0,
                'studentChildrenCount' => 0,
            ],
            'ruleSet' => $this->get2026RuleSet(),
            'payPeriodMonths' => 1,
        ];

        $result = $this->engine->calculatePayslip($input);

        // Gross should include all pay items
        $this->assertEquals(1225.000, $result['gross_salary']);

        // CNSS should apply to items with isCnssApplicable = true (100 + 50 = 150)
        // CNSS = (1000 + 150) * 0.0968 = 111.320
        $this->assertEquals(111.320, $result['cnss_employee_amount']);
    }

    /**
     * Test mid-year hire annualization.
     */
    public function test_mid_year_hire_annualization(): void
    {
        $input = [
            'baseSalary' => 2000.000,
            'payItems' => [],
            'fiscalProfile' => [
                'maritalStatus' => 'single',
                'childrenCount' => 0,
                'disabledChildrenCount' => 0,
                'studentChildrenCount' => 0,
            ],
            'ruleSet' => $this->get2026RuleSet(),
            'payPeriodMonths' => 6, // Hired mid-year
        ];

        $result = $this->engine->calculatePayslip($input);

        // Annualization should use 6 months instead of 12
        // This affects IRPP calculation
        $this->assertGreaterThan(0, $result['irpp_monthly']);
    }

    /**
     * Test minimum annual tax floor.
     */
    public function test_minimum_annual_tax_floor(): void
    {
        $input = [
            'baseSalary' => 100.000, // Very low salary
            'payItems' => [],
            'fiscalProfile' => [
                'maritalStatus' => 'single',
                'childrenCount' => 0,
                'disabledChildrenCount' => 0,
                'studentChildrenCount' => 0,
            ],
            'ruleSet' => $this->get2026RuleSet(),
            'payPeriodMonths' => 1,
        ];

        $result = $this->engine->calculatePayslip($input);

        // IRPP should be at minimum floor (45.000 / 12 = 3.750)
        $this->assertEquals(3.750, $result['irpp_monthly']);
    }

    /**
     * Get 2026 rule set for testing.
     */
    private function get2026RuleSet(): array
    {
        return [
            'cnssEmployeeRate' => 0.0968,
            'cnssEmployerRate' => 0.1707,
            'cssRate' => 0.005,
            'cssExemptThreshold' => 5000.000,
            'profExpenseRate' => 0.10,
            'profExpenseCap' => 2000.000,
            'minAnnualTax' => 45.000,
            'irppBrackets' => [
                ['min' => 0, 'max' => 5000, 'rate' => 0.00],
                ['min' => 5000, 'max' => 10000, 'rate' => 0.15],
                ['min' => 10000, 'max' => 20000, 'rate' => 0.25],
                ['min' => 20000, 'max' => 30000, 'rate' => 0.30],
                ['min' => 30000, 'max' => 40000, 'rate' => 0.33],
                ['min' => 40000, 'max' => 50000, 'rate' => 0.36],
                ['min' => 50000, 'max' => 70000, 'rate' => 0.38],
                ['min' => 70000, 'max' => null, 'rate' => 0.40],
            ],
            'familyDeductions' => [
                ['type' => 'head_of_household', 'amount' => 300.000, 'maxCount' => null],
                ['type' => 'child', 'amount' => 100.000, 'maxCount' => 4],
                ['type' => 'disabled_child', 'amount' => 2000.000, 'maxCount' => null],
                ['type' => 'student_child_non_scholarship', 'amount' => 1000.000, 'maxCount' => null],
            ],
        ];
    }
}
