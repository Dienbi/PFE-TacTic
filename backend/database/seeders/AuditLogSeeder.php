<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\Utilisateur;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        // Get the first RH user as the actor
        $actor = Utilisateur::where('role', 'RH')->first();
        
        if (!$actor) {
            $this->command->warn('No RH user found. Skipping audit log seeding.');
            return;
        }

        // Get some employees for entity_id references
        $employees = Utilisateur::where('role', '!=', 'RH')->limit(3)->get();
        
        if ($employees->isEmpty()) {
            $this->command->warn('No employees found. Skipping audit log seeding.');
            return;
        }

        $actions = [
            [
                'action' => 'payslip.generated',
                'entity_type' => 'Payslip',
                'entity_id' => Str::uuid(),
                'details_json' => [
                    'employee_id' => $employees[0]->id,
                    'pay_period_start' => '2026-01-01',
                    'pay_period_end' => '2026-01-31',
                    'net_salary' => 1250.00,
                ],
                'created_at' => now()->subHours(2),
            ],
            [
                'action' => 'payslip.validated',
                'entity_type' => 'Payslip',
                'entity_id' => Str::uuid(),
                'details_json' => [
                    'employee_id' => $employees[1]->id ?? $employees[0]->id,
                    'net_salary' => 1400.00,
                ],
                'created_at' => now()->subHours(3),
            ],
            [
                'action' => 'payslip.locked',
                'entity_type' => 'Payslip',
                'entity_id' => Str::uuid(),
                'details_json' => [
                    'employee_id' => $employees[2]->id ?? $employees[0]->id,
                    'net_salary' => 1100.00,
                ],
                'created_at' => now()->subHours(5),
            ],
            [
                'action' => 'payment.recorded',
                'entity_type' => 'Payment',
                'entity_id' => Str::uuid(),
                'details_json' => [
                    'payslip_id' => Str::uuid(),
                    'employee_id' => $employees[0]->id,
                    'amount' => 1250.00,
                    'method' => 'bank_transfer',
                ],
                'created_at' => now()->subHours(6),
            ],
            [
                'action' => 'salary.increased',
                'entity_type' => 'Utilisateur',
                'entity_id' => Str::uuid(),
                'details_json' => [
                    'employee_id' => $employees[0]->id,
                    'old_salary' => 1200.00,
                    'new_salary' => 1250.00,
                    'percentage' => 5.0,
                ],
                'created_at' => now()->subDays(1),
            ],
            [
                'action' => 'rule_set.confirmed',
                'entity_type' => 'FiscalRuleSet',
                'entity_id' => Str::uuid(),
                'details_json' => [
                    'year' => 2026,
                    'effective_from' => '2026-01-01',
                ],
                'created_at' => now()->subDays(2),
            ],
        ];

        foreach ($actions as $action) {
            AuditLog::create([
                'id' => Str::uuid(),
                'actor_id' => $actor->id,
                'action' => $action['action'],
                'entity_type' => $action['entity_type'],
                'entity_id' => $action['entity_id'],
                'details_json' => $action['details_json'],
                'created_at' => $action['created_at'],
                'updated_at' => $action['created_at'],
            ]);
        }

        $this->command->info('Audit logs seeded successfully.');
    }
}
