<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Enums\TypeContrat;
use App\Models\Utilisateur;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UtilisateurSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create RH Admin user
        Utilisateur::create([
            'matricule' => 'EMP00001',
            'nom' => 'Admin',
            'prenom' => 'RH',
            'email' => 'admin@tactic.com',
            'password' => Hash::make('password'),
            'telephone' => '0600000000',
            'adresse' => '123 Rue Admin',
            'date_embauche' => now(),
            'type_contrat' => TypeContrat::CDI,
            'salaire_base' => 5000,
            'role' => Role::RH,
            'actif' => true,
            'solde_conge' => 30,
        ]);

        // Create Chef Equipe user
        Utilisateur::create([
            'matricule' => 'EMP00002',
            'nom' => 'Chef',
            'prenom' => 'Equipe',
            'email' => 'chef@tactic.com',
            'password' => Hash::make('password'),
            'telephone' => '0600000001',
            'adresse' => '456 Rue Chef',
            'date_embauche' => now(),
            'type_contrat' => TypeContrat::CDI,
            'salaire_base' => 4000,
            'role' => Role::CHEF_EQUIPE,
            'actif' => true,
            'solde_conge' => 30,
        ]);

        // Create regular employee
        Utilisateur::create([
            'matricule' => 'EMP00003',
            'nom' => 'Employe',
            'prenom' => 'Test',
            'email' => 'employe@tactic.com',
            'password' => Hash::make('password'),
            'telephone' => '0600000002',
            'adresse' => '789 Rue Employe',
            'date_embauche' => now(),
            'type_contrat' => TypeContrat::CDI,
            'salaire_base' => 3000,
            'role' => Role::EMPLOYE,
            'actif' => true,
            'solde_conge' => 30,
        ]);
    }
}
