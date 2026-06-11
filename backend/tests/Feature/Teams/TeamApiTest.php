<?php

namespace Tests\Feature\Teams;

use App\Enums\Role;
use App\Models\Equipe;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class TeamApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function rh_can_create_team(): void
    {
        $rh = $this->createTestRh();
        $manager = $this->createTestManager();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/equipes', [
                'nom' => 'Engineering',
                'chef_equipe_id' => $manager->id,
            ])
            ->assertCreated()
            ->assertJsonPath('nom', 'Engineering');

        $this->assertDatabaseHas('equipes', ['nom' => 'Engineering']);
    }

    /** @test */
    public function rh_can_add_members(): void
    {
        $rh = $this->createTestRh();
        $manager = $this->createTestManager();
        $equipe = $this->createTestEquipe($manager);
        $member = $this->createTestUser(['email' => 'member@tactic.test']);

        $this
            ->actingAsApiUser($rh)
            ->postJson("/api/equipes/{$equipe->id}/membres", [
                'utilisateur_id' => $member->id,
            ])
            ->assertOk();

        $this->assertDatabaseHas('utilisateurs', [
            'id' => $member->id,
            'equipe_id' => $equipe->id,
        ]);
    }

    /** @test */
    public function rh_can_remove_members(): void
    {
        $rh = $this->createTestRh();
        $manager = $this->createTestManager();
        $equipe = $this->createTestEquipe($manager);
        $member = $this->createTestUser([
            'email' => 'remove.member@tactic.test',
            'equipe_id' => $equipe->id,
        ]);

        $this
            ->actingAsApiUser($rh)
            ->deleteJson("/api/equipes/{$equipe->id}/membres/{$member->id}")
            ->assertOk();

        $this->assertDatabaseHas('utilisateurs', [
            'id' => $member->id,
            'equipe_id' => null,
        ]);
    }

    /** @test */
    public function employee_cannot_create_team(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/equipes', ['nom' => 'Blocked Team'])
            ->assertForbidden();

        $this->assertEquals(0, Equipe::count());
    }

    /** @test */
    public function team_name_is_required(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/equipes', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nom']);
    }
}
