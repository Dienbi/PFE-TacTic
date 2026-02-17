<?php

namespace Database\Factories;

use App\Enums\StatutPaie;
use App\Models\Paie;
use App\Models\Utilisateur;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaieFactory extends Factory
{
    protected $model = Paie::class;

    public function definition(): array
    {
        $periodeDebut = Carbon::now()->startOfMonth();
        $periodeFin = Carbon::now()->endOfMonth();
        $salaireBrut = fake()->randomFloat(2, 800, 3000);
        $cnss = round($salaireBrut * 0.0918, 2);
        $impotMensuel = fake()->randomFloat(2, 50, 300);
        $deductions = $cnss + $impotMensuel;
        $salaireNet = round($salaireBrut - $deductions, 2);

        return [
            'utilisateur_id' => Utilisateur::factory(),
            'periode_debut' => $periodeDebut,
            'periode_fin' => $periodeFin,
            'salaire_brut' => $salaireBrut,
            'taux_horaire' => round($salaireBrut / 173, 2),
            'heures_normales' => 173,
            'heures_supp' => 0,
            'montant_heures_supp' => 0,
            'deductions' => $deductions,
            'cnss_employe' => $cnss,
            'cnss_taux' => 9.18,
            'impot_annuel' => $impotMensuel * 12,
            'impot_mensuel' => $impotMensuel,
            'salaire_net' => $salaireNet,
            'date_paiement' => null,
            'statut' => StatutPaie::GENERE,
        ];
    }

    public function valide(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => StatutPaie::VALIDE,
        ]);
    }

    public function paye(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => StatutPaie::PAYE,
            'date_paiement' => Carbon::now(),
        ]);
    }

    public function withOvertime(): static
    {
        return $this->state(function (array $attributes) {
            $heuresSupp = fake()->numberBetween(5, 20);
            $montantHeuresSupp = round($heuresSupp * $attributes['taux_horaire'] * 1.25, 2);
            $salaireBrut = $attributes['salaire_brut'] + $montantHeuresSupp;
            $cnss = round($salaireBrut * 0.0918, 2);
            $deductions = $cnss + $attributes['impot_mensuel'];

            return [
                'heures_supp' => $heuresSupp,
                'montant_heures_supp' => $montantHeuresSupp,
                'salaire_brut' => $salaireBrut,
                'cnss_employe' => $cnss,
                'deductions' => $deductions,
                'salaire_net' => round($salaireBrut - $deductions, 2),
            ];
        });
    }
}
