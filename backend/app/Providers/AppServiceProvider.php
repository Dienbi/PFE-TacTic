<?php

namespace App\Providers;

use App\Models\Paie;
use App\Models\Utilisateur;
use App\Observers\PaieObserver;
use App\Observers\UtilisateurObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
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
