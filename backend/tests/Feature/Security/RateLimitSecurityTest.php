<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\TestHelpers;

class RateLimitSecurityTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function repeated_failed_logins_return_401_not_429(): void
    {
        $user = $this->createTestUser(['email' => 'ratelimit@tactic.test']);

        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ]);

            $this->assertSame(401, $response->status());
            $this->assertNotSame(429, $response->status());
        }
    }
}
