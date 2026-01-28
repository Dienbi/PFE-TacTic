<?php

use App\Http\Controllers\Api\AffectationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompetenceController;
use App\Http\Controllers\Api\CongeController;
use App\Http\Controllers\Api\EquipeController;
use App\Http\Controllers\Api\PaieController;
use App\Http\Controllers\Api\PointageController;
use App\Http\Controllers\Api\PosteController;
use App\Http\Controllers\Api\UtilisateurController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
});

// Protected routes
Route::middleware('jwt.auth')->group(function () {

    // Auth routes
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('me', [AuthController::class, 'me']);
        Route::post('change-password', [AuthController::class, 'changePassword']);
    });

    // User routes (accessible by all authenticated users)
    Route::prefix('utilisateurs')->group(function () {
        Route::get('/', [UtilisateurController::class, 'index']);
        Route::get('/search', [UtilisateurController::class, 'search']);
        Route::get('/disponibles', [UtilisateurController::class, 'disponibles']);
        Route::get('/role/{role}', [UtilisateurController::class, 'byRole']);
        Route::get('/{id}', [UtilisateurController::class, 'show']);

        // RH only routes
        Route::middleware('role:rh')->group(function () {
            Route::post('/', [UtilisateurController::class, 'store']);
            Route::put('/{id}', [UtilisateurController::class, 'update']);
            Route::delete('/{id}', [UtilisateurController::class, 'destroy']);
            Route::post('/{id}/activate', [UtilisateurController::class, 'activate']);
            Route::put('/{id}/status', [UtilisateurController::class, 'updateStatus']);
            Route::put('/{id}/equipe', [UtilisateurController::class, 'assignToEquipe']);
            Route::put('/{id}/competences', [UtilisateurController::class, 'updateCompetences']);
        });
    });

    // Equipe routes
    Route::prefix('equipes')->group(function () {
        Route::get('/', [EquipeController::class, 'index']);
        Route::get('/{id}', [EquipeController::class, 'show']);
        Route::get('/{id}/membres', [EquipeController::class, 'membres']);

        // RH only routes
        Route::middleware('role:rh')->group(function () {
            Route::post('/', [EquipeController::class, 'store']);
            Route::put('/{id}', [EquipeController::class, 'update']);
            Route::delete('/{id}', [EquipeController::class, 'destroy']);
            Route::post('/{id}/chef', [EquipeController::class, 'assignChef']);
            Route::delete('/{id}/chef', [EquipeController::class, 'removeChef']);
            Route::post('/{id}/membres', [EquipeController::class, 'addMembre']);
            Route::delete('/{id}/membres', [EquipeController::class, 'removeMembre']);
        });
    });

    // Pointage routes
    Route::prefix('pointages')->group(function () {
        Route::get('/today', [PointageController::class, 'today']);
        Route::get('/mes-pointages', [PointageController::class, 'mesPointages']);
        Route::post('/entree', [PointageController::class, 'pointerEntree']);
        Route::post('/sortie', [PointageController::class, 'pointerSortie']);
        Route::get('/stats', [PointageController::class, 'stats']);
        Route::get('/period', [PointageController::class, 'byPeriod']);

        // RH & Chef Equipe routes
        Route::middleware('role:rh,chef_equipe')->group(function () {
            Route::get('/date', [PointageController::class, 'byDate']);
            Route::get('/utilisateur/{utilisateurId}', [PointageController::class, 'byUtilisateur']);
            Route::post('/absence', [PointageController::class, 'marquerAbsence']);
            Route::post('/{id}/justifier', [PointageController::class, 'justifierAbsence']);
            Route::put('/{id}', [PointageController::class, 'update']);
            Route::delete('/{id}', [PointageController::class, 'destroy']);
        });
    });

    // Conge routes
    Route::prefix('conges')->group(function () {
        Route::get('/mes-conges', [CongeController::class, 'mesConges']);
        Route::post('/', [CongeController::class, 'store']);
        Route::delete('/{id}/annuler', [CongeController::class, 'annuler']);
        Route::get('/{id}', [CongeController::class, 'show']);

        // RH & Chef Equipe routes
        Route::middleware('role:rh,chef_equipe')->group(function () {
            Route::get('/', [CongeController::class, 'index']);
            Route::get('/en-attente', [CongeController::class, 'enAttente']);
            Route::get('/en-attente/equipe', [CongeController::class, 'enAttenteEquipe']);
            Route::get('/period', [CongeController::class, 'byPeriod']);
            Route::post('/{id}/approuver', [CongeController::class, 'approuver']);
            Route::post('/{id}/refuser', [CongeController::class, 'refuser']);
        });
    });

    // Paie routes
    Route::prefix('paies')->group(function () {
        Route::get('/mes-paies', [PaieController::class, 'mesPaies']);
        Route::get('/stats', [PaieController::class, 'stats']);

        // RH only routes
        Route::middleware('role:rh')->group(function () {
            Route::get('/', [PaieController::class, 'index']);
            Route::get('/non-payees', [PaieController::class, 'nonPayees']);
            Route::get('/total-mensuel', [PaieController::class, 'totalMensuel']);
            Route::get('/utilisateur/{utilisateurId}', [PaieController::class, 'byUtilisateur']);
            Route::get('/{id}', [PaieController::class, 'show']);
            Route::post('/generer', [PaieController::class, 'generer']);
            Route::post('/generer-tous', [PaieController::class, 'genererPourTous']);
            Route::post('/{id}/payer', [PaieController::class, 'marquerPayee']);
            Route::put('/{id}', [PaieController::class, 'update']);
            Route::delete('/{id}', [PaieController::class, 'destroy']);
        });
    });

    // Affectation routes
    Route::prefix('affectations')->group(function () {
        Route::get('/', [AffectationController::class, 'index']);
        Route::get('/actives', [AffectationController::class, 'actives']);
        Route::get('/utilisateur/{utilisateurId}', [AffectationController::class, 'byUtilisateur']);
        Route::get('/poste/{posteId}', [AffectationController::class, 'byPoste']);
        Route::get('/{id}', [AffectationController::class, 'show']);

        // RH only routes
        Route::middleware('role:rh')->group(function () {
            Route::post('/', [AffectationController::class, 'store']);
            Route::put('/{id}', [AffectationController::class, 'update']);
            Route::post('/{id}/terminer', [AffectationController::class, 'terminer']);
            Route::delete('/{id}', [AffectationController::class, 'destroy']);
        });
    });

    // Poste routes
    Route::prefix('postes')->group(function () {
        Route::get('/', [PosteController::class, 'index']);
        Route::get('/actifs', [PosteController::class, 'actifs']);
        Route::get('/search', [PosteController::class, 'search']);
        Route::get('/{id}', [PosteController::class, 'show']);

        // RH only routes
        Route::middleware('role:rh')->group(function () {
            Route::post('/', [PosteController::class, 'store']);
            Route::put('/{id}', [PosteController::class, 'update']);
            Route::delete('/{id}', [PosteController::class, 'destroy']);
        });
    });

    // Competence routes
    Route::prefix('competences')->group(function () {
        Route::get('/', [CompetenceController::class, 'index']);
        Route::get('/search', [CompetenceController::class, 'search']);
        Route::get('/{id}', [CompetenceController::class, 'show']);

        // RH only routes
        Route::middleware('role:rh')->group(function () {
            Route::post('/', [CompetenceController::class, 'store']);
            Route::put('/{id}', [CompetenceController::class, 'update']);
            Route::delete('/{id}', [CompetenceController::class, 'destroy']);
        });
    });
});
