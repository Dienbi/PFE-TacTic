<?php

namespace App\Providers;

use App\Events\NewAccountRequest;
use App\Events\NewActivityLog;
use App\Listeners\InvalidateDashboardCache;
use App\Models\Conge;
use App\Models\Pointage;
use App\Observers\CongeObserver;
use App\Observers\PointageObserver;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],
        NewActivityLog::class => [
            InvalidateDashboardCache::class,
        ],
        NewAccountRequest::class => [
            InvalidateDashboardCache::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        parent::boot();

        // Register observers
        Pointage::observe(PointageObserver::class);
        Conge::observe(CongeObserver::class);
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
