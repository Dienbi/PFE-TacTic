<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue chez TacTic</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #3730a3;
        }
        .logo span {
            color: #6366f1;
        }
        h1 {
            color: #3730a3;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .info-box {
            background-color: #f0f0ff;
            border-left: 4px solid #3730a3;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .info-box p {
            margin: 5px 0;
        }
        .info-label {
            font-weight: 600;
            color: #555;
        }
        .info-value {
            color: #3730a3;
            font-weight: 600;
        }
        .btn {
            display: inline-block;
            background-color: #3730a3;
            color: #ffffff !important;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 25px 0;
            transition: background-color 0.3s;
        }
        .btn:hover {
            background-color: #4f46e5;
        }
        .center {
            text-align: center;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 14px;
        }
        .warning strong {
            color: #856404;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #888;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Tac<span>Tic</span></div>
            <p style="color: #666; margin-top: 5px;">Système de Gestion RH</p>
        </div>

        <h1>Bienvenue {{ $accountRequest->prenom }} {{ $accountRequest->nom }} !</h1>

        <p>Votre demande de création de compte a été approuvée. Vous faites maintenant partie de l'équipe TacTic !</p>

        <div class="info-box">
            <p><span class="info-label">Votre adresse email professionnelle :</span></p>
            <p><span class="info-value">{{ $accountRequest->generated_email }}</span></p>
        </div>

        <p>Pour activer votre compte et définir votre mot de passe, cliquez sur le bouton ci-dessous :</p>

        <div class="center">
            <a href="{{ env('FRONTEND_URL', 'http://localhost:3000') }}/set-password?token={{ $accountRequest->temp_token }}" class="btn">
                Activer mon compte
            </a>
        </div>

        <div class="warning">
            <strong>⚠️ Important :</strong> Ce lien est valable pendant <strong>48 heures</strong> et ne peut être utilisé qu'une seule fois.
            Après avoir défini votre mot de passe, vous pourrez vous connecter avec votre nouvelle adresse email professionnelle.
        </div>

        <div class="footer">
            <p>Cet email a été envoyé automatiquement par le système TacTic.</p>
            <p>Si vous n'avez pas demandé ce compte, veuillez ignorer cet email.</p>
            <p>&copy; {{ date('Y') }} TacTic - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
