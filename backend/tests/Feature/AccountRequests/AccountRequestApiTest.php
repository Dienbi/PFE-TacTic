<?php

namespace Tests\Feature\AccountRequests;

use App\Models\AccountRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class AccountRequestApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function guest_can_submit_account_request(): void
    {
        $this
            ->postJson('/api/account-requests', [
                'nom' => 'Public',
                'prenom' => 'Applicant',
                'personal_email' => 'applicant@personal.test',
            ])
            ->assertCreated()
            ->assertJsonStructure(['message', 'request_id']);

        $this->assertDatabaseHas('account_requests', [
            'personal_email' => 'applicant@personal.test',
            'status' => AccountRequest::STATUS_PENDING,
        ]);
    }

    /** @test */
    public function rh_can_approve_account_request(): void
    {
        Mail::fake();

        $rh = $this->createTestRh();
        $request = AccountRequest::create([
            'nom' => 'New',
            'prenom' => 'Hire',
            'personal_email' => 'new.hire@personal.test',
            'status' => AccountRequest::STATUS_PENDING,
        ]);

        $this
            ->actingAsApiUser($rh)
            ->postJson("/api/account-requests/{$request->id}/approve", [
                'role' => 'EMPLOYE',
            ])
            ->assertOk()
            ->assertJsonStructure(['message', 'generated_email']);

        $this->assertDatabaseHas('account_requests', [
            'id' => $request->id,
            'status' => AccountRequest::STATUS_APPROVED,
        ]);
    }

    /** @test */
    public function rh_can_reject_account_request(): void
    {
        $rh = $this->createTestRh();
        $request = AccountRequest::create([
            'nom' => 'Reject',
            'prenom' => 'Candidate',
            'personal_email' => 'reject@personal.test',
            'status' => AccountRequest::STATUS_PENDING,
        ]);

        $this
            ->actingAsApiUser($rh)
            ->postJson("/api/account-requests/{$request->id}/reject", [
                'reason' => 'Incomplete profile',
            ])
            ->assertOk();

        $this->assertDatabaseHas('account_requests', [
            'id' => $request->id,
            'status' => AccountRequest::STATUS_REJECTED,
        ]);
    }

    /** @test */
    public function employee_cannot_approve_account_request(): void
    {
        $employee = $this->createTestUser();
        $request = AccountRequest::create([
            'nom' => 'Blocked',
            'prenom' => 'User',
            'personal_email' => 'blocked@personal.test',
            'status' => AccountRequest::STATUS_PENDING,
        ]);

        $this
            ->actingAsApiUser($employee)
            ->postJson("/api/account-requests/{$request->id}/approve", [
                'role' => 'EMPLOYE',
            ])
            ->assertForbidden();
    }
}
