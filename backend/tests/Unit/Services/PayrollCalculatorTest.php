<?php

namespace Tests\Unit\Services;

use App\Services\PayrollCalculator;
use Tests\TestCase;

class PayrollCalculatorTest extends TestCase
{
    private PayrollCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new PayrollCalculator();
    }

    /** @test */
    public function it_calculates_hourly_rate_correctly()
    {
        // Base salary of 1730 TND / 173 hours = 10 TND/hour
        $hourlyRate = $this->calculator->calculateHourlyRate(1730);

        $this->assertEquals(10.00, $hourlyRate);
    }

    /** @test */
    public function it_calculates_cnss_correctly()
    {
        // CNSS is 9.18% of gross salary
        // 1000 TND × 0.0918 = 91.80 TND
        $cnss = $this->calculator->calculateCNSS(1000);

        $this->assertEquals(91.80, $cnss);
    }

    /** @test */
    public function it_calculates_annual_tax_for_low_income()
    {
        // Income below 5000 TND annually should have 0% tax
        $tax = $this->calculator->calculateAnnualIncomeTax(4000);

        $this->assertEquals(0.00, $tax);
    }

    /** @test */
    public function it_calculates_annual_tax_for_medium_income()
    {
        // Income of 10,000 TND annually
        // First 5,000 TND at 0% = 0
        // Next 5,000 TND at 26% = 1,300
        // Total = 1,300 TND
        $tax = $this->calculator->calculateAnnualIncomeTax(10000);

        $this->assertEquals(1300.00, $tax);
    }

    /** @test */
    public function it_calculates_annual_tax_with_progressive_brackets()
    {
        // Income of 25,000 TND annually
        // 0-5,000 at 0% = 0
        // 5,001-20,000 (15,000) at 26% = 3,900
        // 20,001-25,000 (5,000) at 28% = 1,400
        // Total = 5,300 TND
        $tax = $this->calculator->calculateAnnualIncomeTax(25000);

        $this->assertEquals(5300.00, $tax);
    }

    /** @test */
    public function it_calculates_full_payroll_without_overtime()
    {
        // Base salary: 1000 TND
        // Expected CNSS: 91.80 TND (9.18%)
        // Taxable annual: (1000 - 91.80) × 12 = 10,898.40
        // Annual tax: First 5000 at 0% + 5898.40 at 26% = 1,533.58
        // Monthly tax: 1,533.58 / 12 = 127.80
        // Net salary: 1000 - 91.80 - 127.80 = 780.40

        $payroll = $this->calculator->calculatePayroll(1000, 0);

        $this->assertEquals(1000.00, $payroll['salaire_brut']);
        $this->assertEquals(91.80, $payroll['cnss_employe']);
        $this->assertEquals(127.80, $payroll['impot_mensuel'], '', 0.01);
        $this->assertEquals(780.40, $payroll['salaire_net'], '', 0.01);
        $this->assertEquals(0, $payroll['heures_supp']);
        $this->assertEquals(0, $payroll['montant_heures_supp']);
    }

    /** @test */
    public function it_calculates_payroll_with_overtime()
    {
        // Base: 1730 TND (hourly rate = 10 TND)
        // Overtime: 10 hours × 10 TND × 1.25 = 125 TND
        // Gross: 1730 + 125 = 1855 TND
        // Expected net: ~1354 TND (after CNSS + tax deductions)

        $payroll = $this->calculator->calculatePayroll(1730, 10);

        $this->assertEquals(10.00, $payroll['taux_horaire']);
        $this->assertEquals(10, $payroll['heures_supp']);
        $this->assertEquals(125.00, $payroll['montant_heures_supp']);
        $this->assertEquals(1855.00, $payroll['salaire_brut']);
        $this->assertGreaterThan(1300, $payroll['salaire_net']);
        $this->assertLessThan(1400, $payroll['salaire_net']);
    }

    /** @test */
    public function it_handles_zero_salary()
    {
        $payroll = $this->calculator->calculatePayroll(0, 0);

        $this->assertEquals(0.00, $payroll['salaire_brut']);
        $this->assertEquals(0.00, $payroll['salaire_net']);
        $this->assertEquals(0.00, $payroll['cnss_employe']);
        $this->assertEquals(0.00, $payroll['impot_mensuel']);
    }

    /** @test */
    public function it_calculates_high_salary_with_max_tax_bracket()
    {
        // High salary to test maximum tax bracket (35% above 50,000 annual)
        $payroll = $this->calculator->calculatePayroll(5000, 0);

        // Annual taxable: (5000 - CNSS) × 12 ≈ 54,000+
        // This should hit the 35% bracket
        $this->assertEquals(5000.00, $payroll['salaire_brut']);
        $this->assertGreaterThan(400, $payroll['impot_mensuel']);
        $this->assertLessThan(5000, $payroll['salaire_net']);
    }

    /** @test */
    public function simulate_returns_same_as_calculate_payroll()
    {
        $calculated = $this->calculator->calculatePayroll(1500, 5);
        $simulated = $this->calculator->simulate(1500, 5);

        $this->assertEquals($calculated, $simulated);
    }

    /** @test */
    public function payroll_deductions_equal_sum_of_cnss_and_tax()
    {
        $payroll = $this->calculator->calculatePayroll(2000, 0);

        $expectedDeductions = $payroll['cnss_employe'] + $payroll['impot_mensuel'];
        $this->assertEquals($expectedDeductions, $payroll['deductions'], '', 0.01);
    }

    /** @test */
    public function net_salary_equals_gross_minus_deductions()
    {
        $payroll = $this->calculator->calculatePayroll(1500, 0);

        $expectedNet = $payroll['salaire_brut'] - $payroll['deductions'];
        $this->assertEquals($expectedNet, $payroll['salaire_net'], '', 0.01);
    }
}
