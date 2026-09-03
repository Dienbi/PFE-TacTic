<?php

namespace Database\Seeders;

use App\Models\FiscalProfileGroup;
use Illuminate\Database\Seeder;

class FixFiscalProfileLabelsSeeder extends Seeder
{
    public function run(): void
    {
        $groups = FiscalProfileGroup::where('label', 'like', '%child(ren)%')->get();
        
        foreach ($groups as $group) {
            $label = $group->label;
            
            // Replace "child(ren)" with "children" first
            $label = preg_replace('/(\d+) child\(ren\)/', '$1 children', $label);
            
            // Then fix "1 children" to "1 child"
            $label = preg_replace('/1 children/', '1 child', $label);
            
            $group->label = $label;
            $group->save();
        }

        $this->command->info("Updated {$groups->count()} fiscal profile group labels.");
    }
}
