<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Utilisateur;

class PopulateGenderAndMaritalStatusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Common male names (Tunisian/Arabic)
        $maleNames = [
            'Mohamed', 'Ahmed', 'Ali', 'Hamza', 'Omar', 'Khalil', 'Youssef', 'Karim', 'Sami', 'Rami',
            'Amine', 'Bilel', 'Fares', 'Wael', 'Mehdi', 'Wassim', 'Hatem', 'Sofiane', 'Riadh', 'Nabil',
            'Aymen', 'Anis', 'Bassel', 'Chadi', 'Dhia', 'Elyes', 'Fares', 'Ghazi', 'Hichem', 'Iheb',
            'Jasser', 'Kais', 'Lotfi', 'Mahdi', 'Nabil', 'Oussama', 'Qais', 'Rami', 'Sami', 'Tarek',
            'Walid', 'Yassine', 'Zied', 'Abdel', 'Abdul', 'Adel', 'Amin', 'Aziz', 'Bassem', 'Chokri'
        ];
        
        // Common female names (Tunisian/Arabic)
        $femaleNames = [
            'Sara', 'Fatma', 'Mariem', 'Hiba', 'Nour', 'Ines', 'Rim', 'Nesrine', 'Olfa', 'Rahma',
            'Sana', 'Manel', 'Asma', 'Amel', 'Leila', 'Khadija', 'Amina', 'Samira', 'Nadia', 'Faten',
            'Chaima', 'Sirine', 'Emna', 'Houda', 'Ikram', 'Jihene', 'Kawthar', 'Lina', 'Maha', 'Noura',
            'Rania', 'Salma', 'Tasnim', 'Wafa', 'Yasmine', 'Zahra', 'Aya', 'Dorra', 'Ghada', 'Hana'
        ];
        
        $users = Utilisateur::all();
        
        foreach ($users as $user) {
            // Determine gender based on first name (prenom)
            $firstName = ucfirst(strtolower($user->prenom));
            
            $isMale = false;
            $isFemale = false;
            
            // Check for exact male name match
            if (in_array($firstName, $maleNames)) {
                $isMale = true;
            }
            // Check for exact female name match
            elseif (in_array($firstName, $femaleNames)) {
                $isFemale = true;
            }
            // If no exact match, check for partial matches
            else {
                foreach ($maleNames as $name) {
                    if (stripos($firstName, $name) !== false) {
                        $isMale = true;
                        break;
                    }
                }
                
                if (!$isMale) {
                    foreach ($femaleNames as $name) {
                        if (stripos($firstName, $name) !== false) {
                            $isFemale = true;
                            break;
                        }
                    }
                }
            }
            
            // If still no match, assign randomly
            if (!$isMale && !$isFemale) {
                $isMale = (rand(1, 2) === 1);
            }
            
            $user->gender = $isMale ? 'male' : 'female';
            
            // Randomly assign marital status with realistic distribution
            $random = rand(1, 100);
            
            if ($random <= 40) {
                $user->marital_status = 'single';
            } elseif ($random <= 75) {
                $user->marital_status = 'married';
            } elseif ($random <= 90) {
                $user->marital_status = 'divorced';
            } else {
                $user->marital_status = 'widowed';
            }
            
            $user->save();
        }
        
        $this->command->info('Successfully populated gender and marital_status for ' . $users->count() . ' users.');
    }
}
