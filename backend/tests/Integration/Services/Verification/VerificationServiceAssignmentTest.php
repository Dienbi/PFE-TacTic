<?php

namespace Tests\Integration\Services\Verification;

use App\Models\Child;
use App\Models\FiscalProfileGroup;
use App\Models\SocialStatusProof;
use App\Services\Verification\VerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\TestHelpers;

class VerificationServiceAssignmentTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    protected VerificationService $verificationService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->verificationService = app(VerificationService::class);
    }

    /** @test */
    public function it_assigns_fiscal_profile_when_social_status_proof_is_approved_and_no_other_pending_changes()
    {
        $employee = $this->createTestUser([
            'gender' => 'male',
            'marital_status' => 'single',
            'children_count' => 0,
        ]);
        $hr = $this->createTestRh();

        // Create a pending social status proof
        $proof = SocialStatusProof::create([
            'utilisateur_id' => $employee->id,
            'social_status' => 'married',
            'status' => 'pending',
            'verified' => false,
        ]);

        // Act - HR verifies the social status proof
        $result = $this->verificationService->verifySocialStatus($proof->id, $hr->id);

        $this->assertTrue($result->success);
        $this->assertDatabaseHas('social_status_proofs', [
            'id' => $proof->id,
            'status' => 'verified',
            'verified' => true,
        ]);

        $this->assertDatabaseHas('utilisateurs', [
            'id' => $employee->id,
            'marital_status' => 'married',
        ]);

        // Verify that a suitable Fiscal Profile Group is found or created, and the employee is assigned
        $group = FiscalProfileGroup::where('gender', 'male')
            ->where('marital_status', 'married')
            ->where('children_count', 0)
            ->first();

        $this->assertNotNull($group);

        $this->assertDatabaseHas('employee_fiscal_profile_assignments', [
            'employee_id' => $employee->id,
            'fiscal_profile_group_id' => $group->id,
            'assigned_by' => $hr->id,
            'effective_to' => null,
        ]);
    }

    /** @test */
    public function it_assigns_fiscal_profile_when_child_is_approved_and_no_other_pending_changes()
    {
        $employee = $this->createTestUser([
            'gender' => 'female',
            'marital_status' => 'married',
            'children_count' => 0,
        ]);
        $hr = $this->createTestRh();

        // Create a pending child
        $child = Child::create([
            'utilisateur_id' => $employee->id,
            'nom' => 'Doe',
            'prenom' => 'Jane',
            'date_naissance' => '2020-01-01',
            'status' => 'healthy',
            'verified' => false,
            'rejected' => false,
        ]);

        // Act - HR verifies the child
        $result = $this->verificationService->verifyChild($child->id, $hr->id);

        $this->assertTrue($result->success);
        $this->assertDatabaseHas('children', [
            'id' => $child->id,
            'verified' => true,
        ]);

        $this->assertDatabaseHas('utilisateurs', [
            'id' => $employee->id,
            'children_count' => 1,
        ]);

        // Verify fiscal profile assignment
        $group = FiscalProfileGroup::where('gender', 'female')
            ->where('marital_status', 'married')
            ->where('children_count', 1)
            ->where('disabled_children_count', 0)
            ->where('student_non_scholarship_children_count', 0)
            ->first();

        $this->assertNotNull($group);

        $this->assertDatabaseHas('employee_fiscal_profile_assignments', [
            'employee_id' => $employee->id,
            'fiscal_profile_group_id' => $group->id,
            'assigned_by' => $hr->id,
            'effective_to' => null,
        ]);
    }

    /** @test */
    public function it_does_not_assign_fiscal_profile_until_the_last_pending_change_is_approved()
    {
        $employee = $this->createTestUser([
            'gender' => 'male',
            'marital_status' => 'single',
            'children_count' => 0,
        ]);
        $hr = $this->createTestRh();

        // 1. Create a pending social status proof
        $proof = SocialStatusProof::create([
            'utilisateur_id' => $employee->id,
            'social_status' => 'married',
            'status' => 'pending',
            'verified' => false,
        ]);

        // 2. Create a pending child
        $child = Child::create([
            'utilisateur_id' => $employee->id,
            'nom' => 'Doe',
            'prenom' => 'Junior',
            'date_naissance' => '2021-05-05',
            'status' => 'healthy',
            'verified' => false,
            'rejected' => false,
        ]);

        // Act Step 1 - HR verifies the social status first
        $result1 = $this->verificationService->verifySocialStatus($proof->id, $hr->id);
        $this->assertTrue($result1->success);

        // Employee marital status is updated to married, but children count is still 0
        $this->assertDatabaseHas('utilisateurs', [
            'id' => $employee->id,
            'marital_status' => 'married',
            'children_count' => 0,
        ]);

        // Verify that NO assignment is made yet because there's still a pending child
        $this->assertDatabaseMissing('employee_fiscal_profile_assignments', [
            'employee_id' => $employee->id,
        ]);

        // Act Step 2 - HR verifies the child
        $result2 = $this->verificationService->verifyChild($child->id, $hr->id);
        $this->assertTrue($result2->success);

        // Employee children count is now updated
        $this->assertDatabaseHas('utilisateurs', [
            'id' => $employee->id,
            'marital_status' => 'married',
            'children_count' => 1,
        ]);

        // NOW an assignment should be made with 1 child and married status
        $group = FiscalProfileGroup::where('gender', 'male')
            ->where('marital_status', 'married')
            ->where('children_count', 1)
            ->first();

        $this->assertNotNull($group);

        $this->assertDatabaseHas('employee_fiscal_profile_assignments', [
            'employee_id' => $employee->id,
            'fiscal_profile_group_id' => $group->id,
            'assigned_by' => $hr->id,
            'effective_to' => null,
        ]);
    }
}
