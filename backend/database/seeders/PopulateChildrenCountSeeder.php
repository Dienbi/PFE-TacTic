<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Utilisateur;

class PopulateChildrenCountSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = Utilisateur::all();
        
        foreach ($users as $user) {
            // Single employees always have 0 children
            if ($user->marital_status === 'single') {
                $user->children_count = 0;
            } else {
                // Married/divorced/widowed: random 0-4 children with realistic distribution
                // More likely to have fewer children
                $weights = [30, 25, 20, 15, 10]; // 0, 1, 2, 3, 4 children
                $random = rand(1, 100);
                
                if ($random <= 30) {
                    $user->children_count = 0;
                } elseif ($random <= 55) {
                    $user->children_count = 1;
                } elseif ($random <= 75) {
                    $user->children_count = 2;
                } elseif ($random <= 90) {
                    $user->children_count = 3;
                } else {
                    $user->children_count = 4;
                }
            }
            
            $user->save();
        }
        
        $this->command->info('Successfully populated children_count for ' . $users->count() . ' users.');
    }
}
