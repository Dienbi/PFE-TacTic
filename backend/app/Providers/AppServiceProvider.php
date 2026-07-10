<?php

namespace App\Providers;

use App\Contracts\Repositories\PerformanceReviewRepositoryInterface;
use App\Contracts\Services\NotificationServiceInterface;
use App\Models\Paie;
use App\Models\Utilisateur;
use App\Observers\PaieObserver;
use App\Observers\UtilisateurObserver;
use App\Repositories\PerformanceReviewRepository;
use App\Services\NotificationService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind repository interface to implementation
        $this->app->bind(
            PerformanceReviewRepositoryInterface::class,
            PerformanceReviewRepository::class
        );

        // Bind notification service interface to implementation
        $this->app->bind(
            NotificationServiceInterface::class,
            NotificationService::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register model observers for cache invalidation
        Utilisateur::observe(UtilisateurObserver::class);
        Paie::observe(PaieObserver::class);
    }
}
