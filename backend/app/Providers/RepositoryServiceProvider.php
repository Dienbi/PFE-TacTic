<?php

namespace App\Providers;

use App\Contracts\Repositories\CongeRepositoryInterface;
use App\Contracts\Repositories\EquipeRepositoryInterface;
use App\Contracts\Repositories\PaieRepositoryInterface;
use App\Contracts\Repositories\PointageRepositoryInterface;
use App\Contracts\Repositories\UtilisateurRepositoryInterface;
use App\Repositories\CongeRepository;
use App\Repositories\EquipeRepository;
use App\Repositories\PaieRepository;
use App\Repositories\PointageRepository;
use App\Repositories\UtilisateurRepository;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * Register repository bindings for dependency injection.
     * Binds repository interfaces to their concrete implementations,
     * enabling dependency inversion (SOLID principle).
     */
    public function register(): void
    {
        $this->app->bind(UtilisateurRepositoryInterface::class, UtilisateurRepository::class);
        $this->app->bind(PaieRepositoryInterface::class, PaieRepository::class);
        $this->app->bind(CongeRepositoryInterface::class, CongeRepository::class);
        $this->app->bind(EquipeRepositoryInterface::class, EquipeRepository::class);
        $this->app->bind(PointageRepositoryInterface::class, PointageRepository::class);
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
