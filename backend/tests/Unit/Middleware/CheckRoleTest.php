<?php

namespace Tests\Unit\Middleware;

use App\Enums\Role;
use App\Http\Middleware\CheckRole;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;
use Tests\TestHelpers;

class CheckRoleTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    private CheckRole $middleware;

    protected function setUp(): void
    {
        parent::setUp();
        $this->middleware = new CheckRole();
    }

    /** @test */
    public function rh_can_access_rh_only_route(): void
    {
        $rh = $this->createTestRh();
        $response = $this->runMiddleware($rh, 'rh');

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
    }

    /** @test */
    public function employee_cannot_access_rh_only_route(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);
        $response = $this->runMiddleware($employee, 'rh');

        $this->assertEquals(Response::HTTP_FORBIDDEN, $response->getStatusCode());
        $payload = json_decode($response->getContent(), true);
        $this->assertSame('Accès non autorisé.', $payload['message'] ?? null);
    }

    /** @test */
    public function unauthenticated_user_gets_401(): void
    {
        $request = Request::create('/api/test', 'GET');
        $response = $this->middleware->handle($request, fn () => response()->json(['ok' => true]), 'rh');

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $response->getStatusCode());
        $payload = json_decode($response->getContent(), true);
        $this->assertSame('Non authentifié.', $payload['message'] ?? null);
    }

    private function runMiddleware(Utilisateur $user, string ...$roles): Response
    {
        $request = Request::create('/api/test', 'GET');
        $request->setUserResolver(fn () => $user);

        return $this->middleware->handle(
            $request,
            fn () => response()->json(['ok' => true], Response::HTTP_OK),
            ...$roles
        );
    }
}
