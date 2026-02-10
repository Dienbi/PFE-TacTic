<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bulletin de Paie - {{ $paie->utilisateur->prenom }} {{ $paie->utilisateur->nom }}</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 13px; color: #333; margin: 0; padding: 20px; }
        .bulletin-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 40px; background: #fff; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .company-info h1 { margin: 0; font-size: 24px; color: #2563eb; }
        .paie-title { text-align: right; }
        .paie-title h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
        .paie-meta { margin-top: 5px; color: #666; }
        .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .employee-info, .period-info { width: 48%; border: 1px solid #eee; padding: 15px; border-radius: 5px; }
        h3 { margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px; font-size: 14px; text-transform: uppercase; color: #555; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .label { font-weight: bold; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #f8fafc; text-align: left; padding: 12px; border-bottom: 2px solid #ddd; font-size: 11px; text-transform: uppercase; color: #666; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .amount { text-align: right; font-family: 'Courier New', monospace; }
        .total-row td { border-top: 2px solid #333; font-weight: bold; font-size: 14px; background: #f8fafc; }
        .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        .signature-box { display: flex; justify-content: space-between; margin-top: 40px; }
        .sig { width: 200px; height: 100px; border: 1px dashed #ccc; padding: 10px; font-size: 10px; color: #999; }
        @media print {
            body { padding: 0; background: #fff; }
            .bulletin-container { border: none; padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="actions no-print" style="text-align: right; margin-bottom: 20px; max-width: 800px; margin: 0 auto;">
        <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">Imprimer / PDF</button>
    </div>

    <div class="bulletin-container">
        <div class="header">
            <div class="company-info">
                <h1>TACTIC RH</h1>
                <p>123 Avenue de la République<br>1000 Tunis, Tunisie</p>
            </div>
            <div class="paie-title">
                <h2>Bulletin de Paie</h2>
                <div class="paie-meta">Période: {{ \Carbon\Carbon::parse($paie->periode_debut)->format('d/m/Y') }} - {{ \Carbon\Carbon::parse($paie->periode_fin)->format('d/m/Y') }}</div>
                <div class="paie-meta">N°: {{ str_pad($paie->id, 6, '0', STR_PAD_LEFT) }}</div>
            </div>
        </div>

        <div class="info-grid">
            <div class="employee-info">
                <h3>Salarié</h3>
                <div class="info-row"><span class="label">Nom Prénom:</span> <span>{{ $paie->utilisateur->nom }} {{ $paie->utilisateur->prenom }}</span></div>
                <div class="info-row"><span class="label">Matricule:</span> <span>{{ $paie->utilisateur->matricule }}</span></div>
                <div class="info-row"><span class="label">Poste:</span> <span>{{ $paie->utilisateur->role ?? 'Salarié' }}</span></div>
                <div class="info-row"><span class="label">Contrat:</span> <span>{{ $paie->utilisateur->type_contrat ?? 'CDI' }}</span></div>
            </div>
            <div class="period-info">
                <h3>Référence</h3>
                <div class="info-row"><span class="label">Date de paiement:</span> <span>{{ $paie->date_paiement ? \Carbon\Carbon::parse($paie->date_paiement)->format('d/m/Y') : 'Non payé' }}</span></div>
                <div class="info-row"><span class="label">Mode de règlement:</span> <span>Virement bancaire</span></div>
                <div class="info-row"><span class="label">Base mensuelle:</span> <span>173.33 Heures</span></div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Rubrique</th>
                    <th>Base / Taux</th>
                    <th style="text-align: right">Gains (TND)</th>
                    <th style="text-align: right">Retenues (TND)</th>
                </tr>
            </thead>
            <tbody>
                <!-- Salaire de base -->
                <tr>
                    <td>Salaire de base</td>
                    <td>{{ number_format($paie->heures_normales, 2) }} h</td>
                    <td class="amount">{{ number_format($paie->utilisateur->salaire_base, 3) }}</td>
                    <td class="amount"></td>
                </tr>

                <!-- Heures Supp -->
                @if($paie->montant_heures_supp > 0)
                <tr>
                    <td>Heures Supplémentaires (125%)</td>
                    <td>{{ number_format($paie->heures_supp, 2) }} h</td>
                    <td class="amount">{{ number_format($paie->montant_heures_supp, 3) }}</td>
                    <td class="amount"></td>
                </tr>
                @endif

                <!-- Total Brut -->
                <tr style="background-color: #f9f9f9; font-weight: bold;">
                    <td>TOTAL BRUT</td>
                    <td></td>
                    <td class="amount">{{ number_format($paie->salaire_brut, 3) }}</td>
                    <td class="amount"></td>
                </tr>

                <!-- Cotisations -->
                <tr>
                    <td>CNSS ({{ $paie->cnss_taux }}%)</td>
                    <td>{{ number_format($paie->salaire_brut, 3) }}</td>
                    <td class="amount"></td>
                    <td class="amount">{{ number_format($paie->cnss_employe, 3) }}</td>
                </tr>

                <!-- Net Imposable -->
                <tr>
                    <td colspan="4" style="padding-top: 10px; border: none;"></td>
                </tr>
                <tr style="color: #666; font-style: italic;">
                    <td>Net Imposable</td>
                    <td></td>
                    <td class="amount">{{ number_format($paie->salaire_brut - $paie->cnss_employe, 3) }}</td>
                    <td class="amount"></td>
                </tr>

                <!-- Impôt -->
                <tr>
                    <td>IRPP (Retenue à la source)</td>
                    <td>Barème</td>
                    <td class="amount"></td>
                    <td class="amount">{{ number_format($paie->impot_mensuel, 3) }}</td>
                </tr>

            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td>NET À PAYER</td>
                    <td></td>
                    <td></td>
                    <td class="amount" style="color: #2563eb;">{{ number_format($paie->salaire_net, 3) }} TND</td>
                </tr>
            </tfoot>
        </table>

        <div class="signature-box">
            <div class="sig">Cachet de l'employeur</div>
            <div class="sig">Signature du salarié</div>
        </div>

        <div class="footer">
            <p>Ce bulletin de paie doit être conservé sans limitation de durée.</p>
            <p>TACTIC RH - SARL au capital de 10.000 TND - RC: 123456789</p>
        </div>
    </div>
</body>
</html>
