<?php

namespace App\Models;

use App\Enums\StatutPaie;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Paie extends Model
{
    use HasFactory;

    protected $table = 'paies';

    protected $fillable = [
        'utilisateur_id',
        'periode_debut',
        'periode_fin',
        'salaire_brut',
        'taux_horaire',
        'heures_normales',
        'heures_supp',
        'montant_heures_supp',
        'deductions',
        'cnss_employe',
        'cnss_taux',
        'impot_annuel',
        'impot_mensuel',
        'salaire_net',
        'date_paiement',
        'statut',
    ];

    protected $casts = [
        'periode_debut' => 'date',
        'periode_fin' => 'date',
        'date_paiement' => 'date',
        'salaire_brut' => 'decimal:2',
        'taux_horaire' => 'decimal:2',
        'heures_normales' => 'decimal:2',
        'heures_supp' => 'decimal:2',
        'montant_heures_supp' => 'decimal:2',
        'deductions' => 'decimal:2',
        'cnss_employe' => 'decimal:2',
        'cnss_taux' => 'decimal:2',
        'impot_annuel' => 'decimal:2',
        'impot_mensuel' => 'decimal:2',
        'salaire_net' => 'decimal:2',
        'statut' => StatutPaie::class,
    ];

    // ── Tax brackets (annual income → marginal rate) ───────────────────
    // Barème IRPP tunisien (annuel)
    public const TAX_BRACKETS = [
        ['min' => 0,     'max' => 5000,  'rate' => 0.00],
        ['min' => 5001,  'max' => 20000, 'rate' => 0.26],
        ['min' => 20001, 'max' => 30000, 'rate' => 0.28],
        ['min' => 30001, 'max' => 50000, 'rate' => 0.32],
        ['min' => 50001, 'max' => PHP_INT_MAX, 'rate' => 0.35],
    ];

    public const CNSS_RATE = 0.0918; // 9.18% (CNSS salariale tunisienne)
    public const STANDARD_MONTHLY_HOURS = 173; // 40h/week × 52/12
    public const OVERTIME_MULTIPLIER = 1.25;

    // ── Relationships ──────────────────────────────────────────────────
    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class);
    }

    // ── Scopes ─────────────────────────────────────────────────────────
    public function scopeByPeriod($query, $startDate, $endDate)
    {
        return $query->whereBetween('periode_debut', [$startDate, $endDate]);
    }

    public function scopePaye($query)
    {
        return $query->where('statut', StatutPaie::PAYE);
    }

    public function scopeNonPaye($query)
    {
        return $query->where('statut', '!=', StatutPaie::PAYE);
    }

    public function scopeByStatut($query, StatutPaie $statut)
    {
        return $query->where('statut', $statut);
    }

    // ── Static Calculation Helpers ─────────────────────────────────────

    /**
     * Calculate hourly rate from monthly base salary.
     */
    public static function calculerTauxHoraire(float $salaireBase): float
    {
        return round($salaireBase / self::STANDARD_MONTHLY_HOURS, 2);
    }

    /**
     * Calculate CNSS employee contribution (9.18% of gross).
     */
    public static function calculerCNSS(float $salaireBrut): float
    {
        return round($salaireBrut * self::CNSS_RATE, 2);
    }

    /**
     * Calculate annual income tax using progressive brackets.
     * Input: annual gross salary (after CNSS).
     */
    public static function calculerImpotAnnuel(float $revenuAnnuelImposable): float
    {
        $totalTax = 0;

        foreach (self::TAX_BRACKETS as $bracket) {
            if ($revenuAnnuelImposable <= 0) {
                break;
            }

            $taxableInBracket = min(
                $revenuAnnuelImposable,
                $bracket['max'] - $bracket['min'] + 1
            );

            if ($taxableInBracket > 0) {
                $totalTax += $taxableInBracket * $bracket['rate'];
                $revenuAnnuelImposable -= $taxableInBracket;
            }
        }

        return round($totalTax, 2);
    }

    /**
     * Full payroll calculation from base salary and overtime hours.
     */
    public static function calculerPaie(float $salaireBase, float $heuresSupp = 0): array
    {
        $tauxHoraire = self::calculerTauxHoraire($salaireBase);
        $montantHeuresSupp = round($heuresSupp * $tauxHoraire * self::OVERTIME_MULTIPLIER, 2);

        $salaireBrut = $salaireBase + $montantHeuresSupp;

        // CNSS on total gross
        $cnss = self::calculerCNSS($salaireBrut);

        // Annual taxable = (gross − CNSS) × 12
        $revenuMensuelImposable = $salaireBrut - $cnss;
        $revenuAnnuelImposable = $revenuMensuelImposable * 12;

        $impotAnnuel = self::calculerImpotAnnuel($revenuAnnuelImposable);
        $impotMensuel = round($impotAnnuel / 12, 2);

        $totalDeductions = $cnss + $impotMensuel;
        $salaireNet = round($salaireBrut - $totalDeductions, 2);

        return [
            'salaire_brut' => $salaireBrut,
            'taux_horaire' => $tauxHoraire,
            'heures_supp' => $heuresSupp,
            'montant_heures_supp' => $montantHeuresSupp,
            'cnss_employe' => $cnss,
            'cnss_taux' => self::CNSS_RATE * 100,
            'impot_annuel' => $impotAnnuel,
            'impot_mensuel' => $impotMensuel,
            'deductions' => $totalDeductions,
            'salaire_net' => $salaireNet,
        ];
    }

    // ── Instance helpers ───────────────────────────────────────────────
    public function isPaye(): bool
    {
        return $this->statut === StatutPaie::PAYE;
    }

    public function isValide(): bool
    {
        return $this->statut === StatutPaie::VALIDE;
    }
}
