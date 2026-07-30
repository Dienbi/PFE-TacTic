<?php

use App\Http\Controllers\Api\AccountRequestController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AffectationController;
use App\Http\Controllers\Api\AIController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChildController;
use App\Http\Controllers\Api\CompetenceController;
use App\Http\Controllers\Api\CongeController;
use App\Http\Controllers\Api\CvUploadController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EquipeController;
use App\Http\Controllers\Api\JobApplicationController;
use App\Http\Controllers\Api\JobPostController;
use App\Http\Controllers\Api\JobRequestController;
use App\Http\Controllers\Api\PaieController;
use App\Http\Controllers\Api\Payroll\AuditLogController;
use App\Http\Controllers\Api\Payroll\FiscalRuleManagementController;
use App\Http\Controllers\Api\Payroll\PaymentTrackingController;
use App\Http\Controllers\Api\Payroll\PayslipCorrectionController;
use App\Http\Controllers\Api\Payroll\PayslipGenerationController;
use App\Http\Controllers\Api\Payroll\RuleImportController;
use App\Http\Controllers\Api\Payroll\YearEndRegularizationController;
use App\Http\Controllers\Api\PerformanceReviewController;
use App\Http\Controllers\Api\PointageController;
use App\Http\Controllers\Api\PosteController;
use App\Http\Controllers\Api\ReportsController;
use App\Http\Controllers\Api\SocialStatusController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PersonalInfoChangeRequestController;
use App\Http\Controllers\Api\UtilisateurController;
use App\Http\Controllers\Api\FiscalProfile\FiscalProfileGroupController;
use App\Http\Controllers\Api\FiscalProfile\EmployeeFiscalProfileAssignmentController;
use App\Http\Controllers\Api\FiscalProfile\HeadOfFamilyOverrideController;
use App\Http\Controllers\Api\FiscalProfile\AiChatController;
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

// Backend health endpoint for liveness/readiness probes
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'service' => 'TacTic Backend API',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Broadcasting auth route (must be before other authenticated routes)
Broadcast::routes(['middleware' => ['jwt.auth']]);

// Account request public routes
Route::prefix('account-requests')->group(function () {
    Route::post('/', [AccountRequestController::class, 'store']);
    Route::get('/validate-token/{token}', [AccountRequestController::class, 'validateToken']);
    Route::post('/set-password', [AccountRequestController::class, 'setPassword']);
});

// AI Service endpoint (no auth required - IP whitelisted in production)
Route::get('/payroll/fiscal-profile/employees/fiscal-search', [EmployeeFiscalProfileAssignmentController::class, 'search']);
Route::get('/payroll/fiscal-profile/groups/search', [FiscalProfileGroupController::class, 'search']);

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

    // CV upload routes (accessible by all authenticated users)
    Route::prefix('cv')->group(function () {
        Route::post('/upload', [CvUploadController::class, 'upload']);
        Route::get('/latest', [CvUploadController::class, 'latest']);
        Route::post('/{id}/confirm', [CvUploadController::class, 'confirm']);
        Route::get('/{id}', [CvUploadController::class, 'show']);
    });

    // Children routes (accessible by all authenticated users)
    Route::prefix('children')->group(function () {
        Route::get('/', [ChildController::class, 'index']);
        Route::post('/', [ChildController::class, 'store']);
        Route::put('/{id}', [ChildController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [ChildController::class, 'destroy'])->where('id', '[0-9]+');
        
        // HR only routes
        Route::middleware('role:rh')->group(function () {
            Route::post('/{id}/verify', [ChildController::class, 'verify'])->where('id', '[0-9]+');
            Route::post('/{id}/reject', [ChildController::class, 'reject'])->where('id', '[0-9]+');
            Route::get('/hr/pending', [ChildController::class, 'indexForHR']);
        });
    });

    // Social status routes (accessible by all authenticated users)
    Route::prefix('social-status')->group(function () {
        Route::get('/', [SocialStatusController::class, 'index']);
        Route::post('/', [SocialStatusController::class, 'store']);
        
        // HR only routes
        Route::middleware('role:rh')->group(function () {
            Route::post('/{id}/verify', [SocialStatusController::class, 'verify'])->where('id', '[0-9]+');
            Route::post('/{id}/reject', [SocialStatusController::class, 'reject'])->where('id', '[0-9]+');
            Route::get('/hr/pending', [SocialStatusController::class, 'indexForHR']);
        });
    });

    // Personal info change request routes (accessible by all authenticated users)
    Route::prefix('change-requests')->group(function () {
        Route::get('/', [PersonalInfoChangeRequestController::class, 'index']);
        Route::post('/', [PersonalInfoChangeRequestController::class, 'store']);
        Route::get('/{id}', [PersonalInfoChangeRequestController::class, 'show'])->where('id', '[0-9a-f-]+');
        Route::post('/{id}/documents', [PersonalInfoChangeRequestController::class, 'uploadDocument'])->where('id', '[0-9a-f-]+');
        
        // HR only routes
        Route::middleware('role:rh')->group(function () {
            Route::get('/hr', [PersonalInfoChangeRequestController::class, 'indexForHR']);
            Route::post('/documents/{documentId}/verify', [PersonalInfoChangeRequestController::class, 'verifyDocument'])->where('documentId', '[0-9a-f-]+');
            Route::post('/{id}/approve', [PersonalInfoChangeRequestController::class, 'approve'])->where('id', '[0-9a-f-]+');
            Route::post('/{id}/reject', [PersonalInfoChangeRequestController::class, 'reject'])->where('id', '[0-9a-f-]+');
            Route::post('/{id}/request-more-info', [PersonalInfoChangeRequestController::class, 'requestMoreInfo'])->where('id', '[0-9a-f-]+');
        });
    });

    // Notification routes (accessible by all authenticated users)
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread', [NotificationController::class, 'unread']);
        Route::post('/{id}/read', [NotificationController::class, 'markAsRead'])->where('id', '[0-9]+');
        Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
    });

    // Dashboard routes (RH only)
    Route::prefix('dashboard')->middleware('role:rh')->group(function () {
        Route::get('/all', [DashboardController::class, 'rhDashboardAll']);
        Route::get('/rh-stats', [DashboardController::class, 'rhStats']);
        Route::get('/attendance-trend', [DashboardController::class, 'attendanceTrend']);
        Route::get('/absence-distribution', [DashboardController::class, 'absenceDistribution']);
    });

    // Manager dashboard route (accessible by chef_equipe and RH)
    Route::get('/dashboard/manager', [DashboardController::class, 'managerDashboard'])
        ->middleware('role:chef_equipe,rh');

    // Employee dashboard route (accessible by all authenticated users)
    Route::get('/dashboard/employee', [DashboardController::class, 'employeeDashboard']);

    // Reports routes (RH only)
    Route::prefix('reports')->middleware('role:rh')->group(function () {
        Route::get('/ai', [ReportsController::class, 'aiReports']);
    });

    // User routes (accessible by all authenticated users)
    Route::prefix('utilisateurs')->group(function () {
        Route::get('/', [UtilisateurController::class, 'index']);
        Route::get('/search', [UtilisateurController::class, 'search']);
        Route::get('/disponibles', [UtilisateurController::class, 'disponibles']);
        Route::get('/role/{role}', [UtilisateurController::class, 'byRole']);

        // Social info route (accessible by all authenticated users - RH and managers can view team info)
        Route::get('/{id}/social-info', [UtilisateurController::class, 'getSocialInfo']);

        // RH only routes (must be before /{id} to avoid conflict)
        Route::middleware('role:rh')->group(function () {
            Route::get('/archived', [UtilisateurController::class, 'archived']);
            Route::get('/logs', [ActivityLogController::class, 'index']);
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
        Route::get('/', [AccountRequestController::class, 'index']);
        Route::get('/pending', [AccountRequestController::class, 'pending']);
        Route::get('/pending-count', [AccountRequestController::class, 'pendingCount']);
        Route::get('/{id}', [AccountRequestController::class, 'show']);
        Route::post('/{id}/approve', [AccountRequestController::class, 'approve']);
        Route::post('/{id}/reject', [AccountRequestController::class, 'reject']);
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
            Route::get('/anomalies', [PointageController::class, 'anomalies']);
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
        Route::get('/', [JobRequestController::class, 'index']);
        Route::get('/{id}', [JobRequestController::class, 'show']);

        // Manager routes
        Route::middleware('role:chef_equipe')->group(function () {
            Route::post('/', [JobRequestController::class, 'store']);
            Route::put('/{id}', [JobRequestController::class, 'update']);
            Route::delete('/{id}', [JobRequestController::class, 'destroy']);
        });

        // HR routes
        Route::middleware('role:rh')->group(function () {
            Route::get('/pending/list', [JobRequestController::class, 'pending']);
            Route::post('/{id}/approve', [JobRequestController::class, 'approve']);
            Route::post('/{id}/reject', [JobRequestController::class, 'reject']);
        });
    });

    // Job Post routes - HR creates, all see published
    Route::prefix('job-posts')->group(function () {
        Route::get('/', [JobPostController::class, 'index']);
        Route::get('/open', [JobPostController::class, 'open']);
        Route::get('/{id}', [JobPostController::class, 'show']);

        // HR only routes
        Route::middleware('role:rh')->group(function () {
            Route::post('/', [JobPostController::class, 'store']);
            Route::put('/{id}', [JobPostController::class, 'update']);
            Route::post('/{id}/publish', [JobPostController::class, 'publish']);
            Route::post('/{id}/close', [JobPostController::class, 'close']);
            Route::delete('/{id}', [JobPostController::class, 'destroy']);
        });
    });

    // Job Application routes - employees apply, HR reviews
    Route::prefix('applications')->group(function () {
        Route::get('/', [JobApplicationController::class, 'index']);
        Route::get('/job-post/{jobPostId}', [JobApplicationController::class, 'byJobPost']);
        Route::get('/{id}', [JobApplicationController::class, 'show']);

        // Employee routes
        Route::middleware('role:employe')->group(function () {
            Route::post('/', [JobApplicationController::class, 'store']);
            Route::post('/{id}/withdraw', [JobApplicationController::class, 'withdraw']);
        });

        // HR routes
        Route::middleware('role:rh')->group(function () {
            Route::post('/{id}/review', [JobApplicationController::class, 'review']);
        });
    });

    // Performance Review routes
    Route::prefix('performance-reviews')->group(function () {
        // Manager routes
        Route::middleware('role:chef_equipe')->group(function () {
            Route::post('/', [PerformanceReviewController::class, 'store']);
            Route::put('/{id}', [PerformanceReviewController::class, 'update'])->where('id', '[0-9]+');
            Route::delete('/{id}', [PerformanceReviewController::class, 'destroy'])->where('id', '[0-9]+');
            Route::get('/team', [PerformanceReviewController::class, 'teamFeedback']);
        });

        // Employee routes
        Route::get('/employee/{employeeId}', [PerformanceReviewController::class, 'employeeHistory'])->where('employeeId', '[0-9]+');
        Route::get('/employee/{employeeId}/latest', [PerformanceReviewController::class, 'latestFeedback'])->where('employeeId', '[0-9]+');

        // HR routes
        Route::middleware('role:rh')->group(function () {
            Route::get('/all', [PerformanceReviewController::class, 'allFeedback']);
        });

        // Common routes
        Route::get('/{id}', [PerformanceReviewController::class, 'show'])->where('id', '[0-9]+');
    });

    // ─── AI Routes ──────────────────────────────────────────────
    Route::prefix('ai')->group(function () {
        // Available to all authenticated users
        Route::get('/health', [AIController::class, 'health']);

        // Predictions & matching (RH only)
        Route::middleware('role:rh')->group(function () {
            Route::get('/predictions/attendance', [AIController::class, 'attendancePredictionsAll']);
            Route::get('/predictions/attendance/{userId}', [AIController::class, 'attendancePrediction']);
            Route::get('/predictions/performance', [AIController::class, 'performanceScoresAll']);
            Route::get('/predictions/performance/{userId}', [AIController::class, 'performanceScore']);
            Route::get('/dashboard-kpis', [AIController::class, 'dashboardKPIs']);
            Route::get('/match/{jobPostId}', [AIController::class, 'matchCandidates']);

            // Training (status must be before {model} to avoid wildcard match)
            Route::get('/train/status', [AIController::class, 'trainingStatus']);
            Route::post('/train/{model}', [AIController::class, 'train']);
        });
    });

    // ─── Payroll Routes (RH only) ───────────────────────────────
    Route::prefix('payroll')->middleware('role:rh')->group(function () {
        // Fiscal Rule Management
        Route::prefix('fiscal-rules')->group(function () {
            Route::get('/', [FiscalRuleManagementController::class, 'index']);
            Route::get('/active', [FiscalRuleManagementController::class, 'getActive']);
            Route::post('/', [FiscalRuleManagementController::class, 'createDraft']);
            Route::put('/{id}/draft', [FiscalRuleManagementController::class, 'updateDraft']);
            Route::post('/{id}/confirm', [FiscalRuleManagementController::class, 'confirm']);
            Route::post('/{id}/supersede', [FiscalRuleManagementController::class, 'supersede']);
            Route::delete('/{id}', [FiscalRuleManagementController::class, 'deleteDraft']);
            Route::get('/{id}', [FiscalRuleManagementController::class, 'show']);

            // IRPP Brackets
            Route::post('/{ruleSetId}/brackets', [FiscalRuleManagementController::class, 'addIrppBracket']);
            Route::put('/brackets/{bracketId}', [FiscalRuleManagementController::class, 'updateIrppBracket']);
            Route::delete('/brackets/{bracketId}', [FiscalRuleManagementController::class, 'deleteIrppBracket']);

            // Family Deductions
            Route::post('/{ruleSetId}/deductions', [FiscalRuleManagementController::class, 'addFamilyDeduction']);
            Route::put('/deductions/{deductionId}', [FiscalRuleManagementController::class, 'updateFamilyDeduction']);
            Route::delete('/deductions/{deductionId}', [FiscalRuleManagementController::class, 'deleteFamilyDeduction']);
        });

        // Payslip Generation
        Route::prefix('payslips')->group(function () {
            Route::get('/', [PayslipGenerationController::class, 'index']);
            Route::post('/single', [PayslipGenerationController::class, 'generateSingle']);
            Route::post('/batch', [PayslipGenerationController::class, 'generateBatch']);
            Route::get('/period', [PayslipGenerationController::class, 'getByPeriod']);
            Route::get('/employee/{employeeId}', [PayslipGenerationController::class, 'getByEmployee']);
            Route::post('/{id}/validate', [PayslipGenerationController::class, 'validatePayslip']);
            Route::post('/{id}/lock', [PayslipGenerationController::class, 'lock']);
            Route::delete('/{id}', [PayslipGenerationController::class, 'deleteDraft']);
            Route::get('/{id}', [PayslipGenerationController::class, 'show']);
        });

        // Payment Tracking
        Route::prefix('payments')->group(function () {
            Route::get('/statistics', [PaymentTrackingController::class, 'statistics']);
            Route::get('/', [PaymentTrackingController::class, 'index']);
            Route::post('/', [PaymentTrackingController::class, 'record']);
            Route::get('/payslip/{payslipId}', [PaymentTrackingController::class, 'getByPayslip']);
            Route::get('/employee/{employeeId}', [PaymentTrackingController::class, 'getByEmployee']);
            Route::get('/{id}', [PaymentTrackingController::class, 'show']);
            Route::put('/{id}', [PaymentTrackingController::class, 'update']);
            Route::delete('/{id}', [PaymentTrackingController::class, 'delete']);
        });

        // Payslip Correction
        Route::prefix('corrections')->group(function () {
            Route::post('/{originalPayslipId}', [PayslipCorrectionController::class, 'createCorrection']);
            Route::get('/history/{payslipId}', [PayslipCorrectionController::class, 'getHistory']);
            Route::post('/compare', [PayslipCorrectionController::class, 'compare']);
            Route::post('/{currentPayslipId}/revert', [PayslipCorrectionController::class, 'revert']);
        });

        // Year-End Regularization
        Route::prefix('regularization')->group(function () {
            Route::post('/calculate/{employeeId}', [YearEndRegularizationController::class, 'calculateRegularization']);
            Route::post('/create/{employeeId}', [YearEndRegularizationController::class, 'createRegularizationPayslip']);
            Route::post('/batch-calculate', [YearEndRegularizationController::class, 'batchCalculate']);
            Route::get('/summary/{employeeId}', [YearEndRegularizationController::class, 'getYearlySummary']);
            Route::get('/employees', [YearEndRegularizationController::class, 'getEmployeesWithRegularizations']);
        });

        // Rule Import
        Route::prefix('rule-import')->group(function () {
            Route::post('/upload', [RuleImportController::class, 'uploadPdf']);
            Route::post('/{importLogId}/confirm', [RuleImportController::class, 'reviewAndConfirm']);
            Route::post('/{importLogId}/reject', [RuleImportController::class, 'reject']);
            Route::get('/pending', [RuleImportController::class, 'getPending']);
            Route::get('/history', [RuleImportController::class, 'getHistory']);
            Route::get('/{importLogId}', [RuleImportController::class, 'show']);
        });

        // Audit Log
        Route::prefix('audit')->group(function () {
            Route::get('/statistics', [AuditLogController::class, 'getStatistics']);
            Route::get('/trail', [AuditLogController::class, 'getAuditTrail']);
            Route::get('/action', [AuditLogController::class, 'getActionLogs']);
            Route::get('/actor/{actorId}', [AuditLogController::class, 'getActorLogs']);
            Route::post('/', [AuditLogController::class, 'logAction']);
            Route::get('/', [AuditLogController::class, 'getAllLogs']);
        });

        // ─── Fiscal Profile Module ─────────────────────────────────
        Route::prefix('fiscal-profile')->group(function () {
            // Fiscal Profile Groups
            Route::prefix('groups')->group(function () {
                Route::get('/', [FiscalProfileGroupController::class, 'index']);
                Route::post('/', [FiscalProfileGroupController::class, 'store']);
                Route::get('/{id}', [FiscalProfileGroupController::class, 'show'])->where('id', '[0-9a-f-]+');
                Route::get('/{id}/employees', [FiscalProfileGroupController::class, 'employees'])->where('id', '[0-9a-f-]+');
                Route::get('/match', [FiscalProfileGroupController::class, 'match']);
                Route::put('/{id}', [FiscalProfileGroupController::class, 'update'])->where('id', '[0-9a-f-]+');
                Route::delete('/{id}', [FiscalProfileGroupController::class, 'destroy'])->where('id', '[0-9a-f-]+');
            });

            // Employee Fiscal Profile Assignments
            Route::prefix('employees')->group(function () {
                Route::get('/{employeeId}/fiscal-profile-history', [EmployeeFiscalProfileAssignmentController::class, 'history'])->where('employeeId', '[0-9]+');
                Route::get('/{employeeId}/fiscal-profile', [EmployeeFiscalProfileAssignmentController::class, 'current'])->where('employeeId', '[0-9]+');
                Route::post('/{employeeId}/fiscal-profile-assign', [EmployeeFiscalProfileAssignmentController::class, 'assign'])->where('employeeId', '[0-9]+');
                Route::post('/{employeeId}/fiscal-profile-reassign', [EmployeeFiscalProfileAssignmentController::class, 'reassign'])->where('employeeId', '[0-9]+');
            });

            Route::prefix('groups')->group(function () {
                Route::post('/{groupId}/bulk-assign', [EmployeeFiscalProfileAssignmentController::class, 'bulkAssign'])->where('groupId', '[0-9a-f-]+');
            });

            // Head of Family Overrides
            Route::prefix('employees')->group(function () {
                Route::get('/{employeeId}/fiscal-profile-overrides', [HeadOfFamilyOverrideController::class, 'index'])->where('employeeId', '[0-9]+');
                Route::get('/{employeeId}/fiscal-profile-overrides/active', [HeadOfFamilyOverrideController::class, 'active'])->where('employeeId', '[0-9]+');
                Route::post('/{employeeId}/fiscal-profile-overrides', [HeadOfFamilyOverrideController::class, 'store'])->where('employeeId', '[0-9]+');
            });

            // AI Chatbot
            Route::prefix('ai-chat')->group(function () {
                Route::post('/message', [AiChatController::class, 'sendMessage']);
                Route::get('/session/{id}', [AiChatController::class, 'getSession'])->where('id', '[0-9a-f-]+');
                Route::get('/sessions', [AiChatController::class, 'getSessions']);
            });
        });
    });
});
