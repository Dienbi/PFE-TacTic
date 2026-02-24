<?php

use App\Http\Controllers\Api\AffectationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompetenceController;
use App\Http\Controllers\Api\CongeController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EquipeController;
use App\Http\Controllers\Api\PaieController;
use App\Http\Controllers\Api\PointageController;
use App\Http\Controllers\Api\PosteController;
use App\Http\Controllers\Api\UtilisateurController;
use Illuminate\Support\Facades\Broadcast;
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

// Test CORS endpoint
Route::get('/test-cors', function () {
    return response()->json(['message' => 'CORS is working!', 'timestamp' => now()]);
});

// Broadcasting auth route (must be before other authenticated routes)
Broadcast::routes(['middleware' => ['auth:api']]);

// Account request public routes
Route::prefix('account-requests')->group(function () {
    Route::post('/', [App\Http\Controllers\Api\AccountRequestController::class, 'store']);
    Route::get('/validate-token/{token}', [App\Http\Controllers\Api\AccountRequestController::class, 'validateToken']);
    Route::post('/set-password', [App\Http\Controllers\Api\AccountRequestController::class, 'setPassword']);
});

// Protected routes
Route::middleware('jwt.auth')->group(function () {

    // Auth routes
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('me', [AuthController::class, 'me']);
        Route::post('change-password', [AuthController::class, 'changePassword']);
        Route::put('update-profile', [AuthController::class, 'updateProfile']);
        Route::put('update-skills', [AuthController::class, 'updateSkills']);
    });

    // Dashboard routes
    Route::prefix('dashboard')->group(function () {
        Route::get('/all', [DashboardController::class, 'rhDashboardAll']);
        Route::get('/rh-stats', [DashboardController::class, 'rhStats']);
        Route::get('/attendance-trend', [DashboardController::class, 'attendanceTrend']);
        Route::get('/absence-distribution', [DashboardController::class, 'absenceDistribution']);
    });

    // User routes (accessible by all authenticated users)
    Route::prefix('utilisateurs')->group(function () {
        Route::get('/', [UtilisateurController::class, 'index']);
        Route::get('/search', [UtilisateurController::class, 'search']);
        Route::get('/disponibles', [UtilisateurController::class, 'disponibles']);
        Route::get('/role/{role}', [UtilisateurController::class, 'byRole']);

        // RH only routes (must be before /{id} to avoid conflict)
        Route::middleware('role:rh')->group(function () {
            Route::get('/archived', [UtilisateurController::class, 'archived']);
            Route::get('/logs', [App\Http\Controllers\Api\ActivityLogController::class, 'index']);
            Route::post('/', [UtilisateurController::class, 'store']);
            Route::put('/{id}', [UtilisateurController::class, 'update']);
            Route::delete('/{id}', [UtilisateurController::class, 'destroy']);
            Route::post('/{id}/activate', [UtilisateurController::class, 'activate']);
            Route::post('/{id}/restore', [UtilisateurController::class, 'restore']);
            Route::delete('/{id}/force', [UtilisateurController::class, 'forceDelete']);
            Route::put('/{id}/status', [UtilisateurController::class, 'updateStatus']);
            Route::put('/{id}/equipe', [UtilisateurController::class, 'assignToEquipe']);
            Route::put('/{id}/competences', [UtilisateurController::class, 'updateCompetences']);
        });

        // This must come after /archived to avoid conflict
        Route::get('/{id}', [UtilisateurController::class, 'show']);
    });

    // Account requests (RH only)
    Route::prefix('account-requests')->middleware('role:rh')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\AccountRequestController::class, 'index']);
        Route::get('/pending', [App\Http\Controllers\Api\AccountRequestController::class, 'pending']);
        Route::get('/pending-count', [App\Http\Controllers\Api\AccountRequestController::class, 'pendingCount']);
        Route::get('/{id}', [App\Http\Controllers\Api\AccountRequestController::class, 'show']);
        Route::post('/{id}/approve', [App\Http\Controllers\Api\AccountRequestController::class, 'approve']);
        Route::post('/{id}/reject', [App\Http\Controllers\Api\AccountRequestController::class, 'reject']);
    });

    // Equipe routes
    Route::prefix('equipes')->group(function () {
        Route::get('/', [EquipeController::class, 'index']);

        // Manager route
        Route::get('/my-team', [EquipeController::class, 'myTeam'])->middleware('role:chef_equipe,rh');

        // RH-only routes (must be before /{id} routes)
        Route::middleware('role:rh')->group(function () {
            Route::get('/available-managers', [EquipeController::class, 'availableManagers']);
            Route::get('/available-employees', [EquipeController::class, 'availableEmployees']);
            Route::post('/', [EquipeController::class, 'store']);
        });

        // Routes with ID parameter (after specific routes)
        Route::get('/{id}', [EquipeController::class, 'show'])->where('id', '[0-9]+');
        Route::get('/{id}/membres', [EquipeController::class, 'membres'])->where('id', '[0-9]+');

        Route::middleware('role:rh')->group(function () {
            Route::put('/{id}', [EquipeController::class, 'update'])->where('id', '[0-9]+');
            Route::delete('/{id}', [EquipeController::class, 'destroy'])->where('id', '[0-9]+');
            Route::post('/{id}/chef', [EquipeController::class, 'assignChef'])->where('id', '[0-9]+');
            Route::delete('/{id}/chef', [EquipeController::class, 'removeChef'])->where('id', '[0-9]+');
            Route::post('/{id}/membres', [EquipeController::class, 'addMembre'])->where('id', '[0-9]+');
            Route::delete('/{id}/membres/{utilisateur_id}', [EquipeController::class, 'removeMembre'])->where('id', '[0-9]+');
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
            Route::get('/summary', [PointageController::class, 'summary']);
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

        // RH & Chef Equipe routes
        Route::middleware('role:rh,chef_equipe')->group(function () {
            Route::get('/', [CongeController::class, 'index']);
            Route::get('/en-attente', [CongeController::class, 'enAttente']);
            Route::get('/en-attente/equipe', [CongeController::class, 'enAttenteEquipe']);
            Route::get('/period', [CongeController::class, 'byPeriod']);
            Route::post('/{id}/approuver', [CongeController::class, 'approuver']);
            Route::post('/{id}/refuser', [CongeController::class, 'refuser']);
            Route::get('/{id}/medical-file', [CongeController::class, 'downloadMedicalFile'])->where('id', '[0-9]+');
        });

        // This must be last to avoid catching routes like /en-attente
        Route::get('/{id}', [CongeController::class, 'show'])->where('id', '[0-9]+');
    });

    // Paie routes
    Route::prefix('paies')->group(function () {
        Route::get('/mes-paies', [PaieController::class, 'mesPaies']);
        Route::get('/stats', [PaieController::class, 'stats']);
        // Allow downloading payslip (Auth check inside controller)
        Route::get('/{id}/download', [PaieController::class, 'download'])->where('id', '[0-9]+');

        // Manager routes
        Route::middleware('role:rh,chef_equipe')->group(function () {
            Route::get('/team', [PaieController::class, 'teamPayroll']);
        });

        // RH only routes
        Route::middleware('role:rh')->group(function () {
            Route::get('/', [PaieController::class, 'index']);
            // Global salary increase
            Route::post('/increase-salaries', [PaieController::class, 'increaseSalaries']);

            Route::get('/non-payees', [PaieController::class, 'nonPayees']);
            Route::get('/total-mensuel', [PaieController::class, 'totalMensuel']);
            Route::get('/global-stats', [PaieController::class, 'globalStats']);
            Route::get('/employees-config', [PaieController::class, 'employeesConfig']);
            Route::post('/configurer-salaire', [PaieController::class, 'configurerSalaire']);
            Route::post('/simuler', [PaieController::class, 'simuler']);
            Route::post('/preview', [PaieController::class, 'preview']);
            Route::get('/utilisateur/{utilisateurId}', [PaieController::class, 'byUtilisateur']);
            Route::get('/{id}', [PaieController::class, 'show'])->where('id', '[0-9]+');
            Route::post('/generer', [PaieController::class, 'generer']);
            Route::post('/generer-tous', [PaieController::class, 'genererPourTous']);
            Route::post('/{id}/valider', [PaieController::class, 'valider']);
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

    // Job Request routes - managers create, HR reviews
    Route::prefix('job-requests')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\JobRequestController::class, 'index']);
        Route::get('/{id}', [App\Http\Controllers\Api\JobRequestController::class, 'show']);

        // Manager routes
        Route::middleware('role:chef_equipe')->group(function () {
            Route::post('/', [App\Http\Controllers\Api\JobRequestController::class, 'store']);
            Route::put('/{id}', [App\Http\Controllers\Api\JobRequestController::class, 'update']);
            Route::delete('/{id}', [App\Http\Controllers\Api\JobRequestController::class, 'destroy']);
        });

        // HR routes
        Route::middleware('role:rh')->group(function () {
            Route::get('/pending/list', [App\Http\Controllers\Api\JobRequestController::class, 'pending']);
            Route::post('/{id}/approve', [App\Http\Controllers\Api\JobRequestController::class, 'approve']);
            Route::post('/{id}/reject', [App\Http\Controllers\Api\JobRequestController::class, 'reject']);
        });
    });

    // Job Post routes - HR creates, all see published
    Route::prefix('job-posts')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\JobPostController::class, 'index']);
        Route::get('/open', [App\Http\Controllers\Api\JobPostController::class, 'open']);
        Route::get('/{id}', [App\Http\Controllers\Api\JobPostController::class, 'show']);

        // HR only routes
        Route::middleware('role:rh')->group(function () {
            Route::post('/', [App\Http\Controllers\Api\JobPostController::class, 'store']);
            Route::put('/{id}', [App\Http\Controllers\Api\JobPostController::class, 'update']);
            Route::post('/{id}/publish', [App\Http\Controllers\Api\JobPostController::class, 'publish']);
            Route::post('/{id}/close', [App\Http\Controllers\Api\JobPostController::class, 'close']);
            Route::delete('/{id}', [App\Http\Controllers\Api\JobPostController::class, 'destroy']);
        });
    });

    // Job Application routes - employees apply, HR reviews
    Route::prefix('applications')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\JobApplicationController::class, 'index']);
        Route::get('/job-post/{jobPostId}', [App\Http\Controllers\Api\JobApplicationController::class, 'byJobPost']);
        Route::get('/{id}', [App\Http\Controllers\Api\JobApplicationController::class, 'show']);

        // Employee routes
        Route::middleware('role:employe')->group(function () {
            Route::post('/', [App\Http\Controllers\Api\JobApplicationController::class, 'store']);
            Route::post('/{id}/withdraw', [App\Http\Controllers\Api\JobApplicationController::class, 'withdraw']);
        });

        // HR routes
        Route::middleware('role:rh')->group(function () {
            Route::post('/{id}/review', [App\Http\Controllers\Api\JobApplicationController::class, 'review']);
        });
    });
});
