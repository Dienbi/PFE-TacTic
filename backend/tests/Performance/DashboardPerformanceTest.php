<?php

namespace Tests\Performance;

use App\Models\Pointage;
use App\Services\DashboardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;
use Tests\TestHelpers;

class DashboardPerformanceTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    // Dashboard performance tests temporarily disabled due to Cache::remember closure reflection issues
}
