<?php

namespace Database\Seeders;

use App\Enums\ApplicationStatus;
use App\Enums\EmployeStatus;
use App\Enums\JobPostStatus;
use App\Enums\JobRequestStatus;
use App\Enums\Role;
use App\Enums\StatutConge;
use App\Enums\StatutPaie;
use App\Enums\TypeConge;
use App\Enums\TypeContrat;
use App\Models\Affectation;
use App\Models\Competence;
use App\Models\Conge;
use App\Models\Equipe;
use App\Models\JobApplication;
use App\Models\JobPost;
use App\Models\JobRequest;
use App\Models\Paie;
use App\Models\Pointage;
use App\Models\Poste;
use App\Models\Utilisateur;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class FullDataSeeder extends Seeder
{
    // Attendance profiles: probability of being present on a workday
    private const ATTENDANCE_PROFILES = [
        'excellent'  => ['presence_rate' => 0.96, 'late_rate' => 0.05, 'weight' => 30],
        'good'       => ['presence_rate' => 0.88, 'late_rate' => 0.15, 'weight' => 35],
        'average'    => ['presence_rate' => 0.78, 'late_rate' => 0.25, 'weight' => 20],
        'poor'       => ['presence_rate' => 0.62, 'late_rate' => 0.40, 'weight' => 10],
        'irregular'  => ['presence_rate' => 0.50, 'late_rate' => 0.50, 'weight' => 5],
    ];

    private array $firstNames = [
        'Mohamed', 'Ahmed', 'Youssef', 'Ali', 'Omar', 'Khalil', 'Amine', 'Hamza',
        'Sami', 'Rami', 'Nabil', 'Karim', 'Fares', 'Bilel', 'Sofiane', 'Riadh',
        'Fatma', 'Amira', 'Sara', 'Ines', 'Mariem', 'Hiba', 'Nour', 'Yasmine',
        'Salma', 'Rim', 'Emna', 'Asma', 'Donia', 'Chaima', 'Nesrine', 'Olfa',
        'Wael', 'Zied', 'Hatem', 'Slim', 'Aymen', 'Tarek', 'Mehdi', 'Wassim',
        'Rahma', 'Sana', 'Houda', 'Manel', 'Amel', 'Sirine', 'Ghada', 'Nadia',
        'Oussama', 'Aziz',
    ];

    private array $lastNames = [
        'Ben Ali', 'Trabelsi', 'Bouazizi', 'Gharbi', 'Hamdi', 'Jebali', 'Khelifi',
        'Mansouri', 'Nasri', 'Othman', 'Riahi', 'Saidi', 'Talbi', 'Zouari',
        'Arfaoui', 'Belhadj', 'Chaabane', 'Dridi', 'Ezzeddine', 'Ferchichi',
        'Guesmi', 'Haddad', 'Issa', 'Jerbi', 'Karoui', 'Lahmar', 'Mbarki',
        'Nasr', 'Oueslati', 'Rezgui', 'Sboui', 'Tlili', 'Yousfi', 'Zaier',
        'Ammar', 'Bouzid', 'Cherif', 'Dhaouadi', 'Essid', 'Feki', 'Gouider',
        'Hajji', 'Jaziri', 'Khemiri', 'Limam', 'Maaloul', 'Nouri', 'Sghaier',
        'Turki', 'Zribi',
    ];

    public function run(): void
    {
        $this->command->info('🔧 Starting FullDataSeeder...');

        $competences = Competence::all();
        $equipes = Equipe::all();

        if ($competences->isEmpty() || $equipes->isEmpty()) {
            $this->command->error('Please run CompetenceSeeder and EquipeSeeder first!');
            return;
        }

        // ────────────────────────────────────────────────────────────
        // 1. Create Employees (47 new ones + 3 existing = 50 total)
        // ────────────────────────────────────────────────────────────
        $this->command->info('👥 Creating employees...');
        $existingCount = Utilisateur::count();
        $toCreate = 50 - $existingCount;

        $employees = Utilisateur::all();
        $newEmployees = collect();

        // Assign existing users to teams
        $existingUsers = Utilisateur::all();
        foreach ($existingUsers as $idx => $user) {
            if (!$user->equipe_id) {
                $equipe = $equipes[$idx % $equipes->count()];
                $user->update(['equipe_id' => $equipe->id]);
            }
        }

        // Assign chefs to equipes
        $chefs = Utilisateur::where('role', Role::CHEF_EQUIPE)->get();
        foreach ($equipes as $idx => $equipe) {
            if (!$equipe->chef_equipe_id && isset($chefs[$idx])) {
                $equipe->update(['chef_equipe_id' => $chefs[$idx]->id]);
            }
        }

        for ($i = 0; $i < $toCreate; $i++) {
            $matricule = sprintf('EMP%05d', $existingCount + $i + 1);
            $firstName = $this->firstNames[$i % count($this->firstNames)];
            $lastName = $this->lastNames[$i % count($this->lastNames)];
            $yearsAgo = rand(1, 5);
            $monthsAgo = rand(0, 11);
            $dateEmbauche = Carbon::now()->subYears($yearsAgo)->subMonths($monthsAgo);

            $isChef = $i < 4; // First 4 new employees are team leads
            $role = $isChef ? Role::CHEF_EQUIPE : Role::EMPLOYE;
            $contractTypes = [TypeContrat::CDI, TypeContrat::CDI, TypeContrat::CDI, TypeContrat::CDD, TypeContrat::STAGE];
            $salary = $isChef ? rand(3500, 5000) : rand(1500, 4000);

            $equipe = $equipes[($i + $existingCount) % $equipes->count()];

            $user = Utilisateur::create([
                'matricule' => $matricule,
                'nom' => $lastName,
                'prenom' => $firstName,
                'email' => strtolower($firstName) . '.' . strtolower(str_replace(' ', '', $lastName)) . '@tactic.com',
                'password' => Hash::make('password'),
                'telephone' => '06' . str_pad(rand(0, 99999999), 8, '0', STR_PAD_LEFT),
                'adresse' => rand(1, 200) . ' Rue ' . ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Ariana'][rand(0, 4)],
                'date_embauche' => $dateEmbauche,
                'type_contrat' => $contractTypes[array_rand($contractTypes)],
                'salaire_base' => $salary,
                'status' => EmployeStatus::DISPONIBLE,
                'role' => $role,
                'actif' => true,
                'solde_conge' => 30,
                'equipe_id' => $equipe->id,
            ]);

            // Assign chef to equipe if slot available
            if ($isChef) {
                $unledEquipe = Equipe::whereNull('chef_equipe_id')->first();
                if ($unledEquipe) {
                    $unledEquipe->update(['chef_equipe_id' => $user->id]);
                }
            }

            $newEmployees->push($user);
        }

        $employees = Utilisateur::all();
        $this->command->info("  ✓ {$employees->count()} employees total");

        // ────────────────────────────────────────────────────────────
        // 2. Assign Skills to Employees
        // ────────────────────────────────────────────────────────────
        $this->command->info('🎯 Assigning skills...');
        foreach ($employees as $employee) {
            if ($employee->competences()->count() > 0) continue;

            $skillCount = rand(3, 8);
            $selectedSkills = $competences->random($skillCount);
            $pivotData = [];
            foreach ($selectedSkills as $skill) {
                $pivotData[$skill->id] = ['niveau' => rand(1, 5)];
            }
            $employee->competences()->attach($pivotData);
        }

        // ────────────────────────────────────────────────────────────
        // 3. Generate 6 Months of Attendance (Pointages)
        // ────────────────────────────────────────────────────────────
        $this->command->info('📅 Generating 6 months of attendance...');

        $startDate = Carbon::now()->subMonths(6)->startOfMonth();
        $endDate = Carbon::now()->subDay();

        // Build workdays list (Mon-Fri, no weekends)
        $period = CarbonPeriod::create($startDate, $endDate);
        $workdays = [];
        foreach ($period as $day) {
            if ($day->isWeekday()) {
                $workdays[] = $day->toDateString();
            }
        }

        // Assign attendance profile to each employee
        $profileNames = [];
        $profileWeights = [];
        foreach (self::ATTENDANCE_PROFILES as $name => $profile) {
            $profileNames[] = $name;
            $profileWeights[] = $profile['weight'];
        }

        $pointageBatch = [];
        $batchSize = 500;

        foreach ($employees as $employee) {
            // Weighted random profile selection
            $profile = $this->weightedRandom($profileNames, $profileWeights);
            $presenceRate = self::ATTENDANCE_PROFILES[$profile]['presence_rate'];
            $lateRate = self::ATTENDANCE_PROFILES[$profile]['late_rate'];

            // Day-of-week modifier (Monday/Friday slightly more absent)
            $dowModifier = [
                1 => -0.03, // Monday
                2 => 0.0,
                3 => 0.02,
                4 => 0.01,
                5 => -0.05, // Friday
            ];

            foreach ($workdays as $day) {
                $dayOfWeek = Carbon::parse($day)->dayOfWeekIso; // 1=Mon, 5=Fri
                $effectiveRate = $presenceRate + ($dowModifier[$dayOfWeek] ?? 0);

                $isPresent = (mt_rand(1, 100) / 100) <= $effectiveRate;

                if ($isPresent) {
                    // Normal entry 8:00-8:30, late 8:30-10:00
                    $isLate = (mt_rand(1, 100) / 100) <= $lateRate;

                    if ($isLate) {
                        $entryHour = rand(8, 9);
                        $entryMin = $entryHour === 8 ? rand(31, 59) : rand(0, 30);
                    } else {
                        $entryHour = rand(7, 8);
                        $entryMin = $entryHour === 7 ? rand(30, 59) : rand(0, 30);
                    }

                    // Exit between 16:30 and 19:00
                    $exitHour = rand(16, 19);
                    $exitMin = $exitHour === 19 ? rand(0, 0) : rand(0, 59);
                    if ($exitHour === 16) $exitMin = rand(30, 59);

                    $entryTime = sprintf('%02d:%02d:00', $entryHour, $entryMin);
                    $exitTime = sprintf('%02d:%02d:00', $exitHour, $exitMin);

                    $entryCarbon = Carbon::createFromFormat('H:i:s', $entryTime);
                    $exitCarbon = Carbon::createFromFormat('H:i:s', $exitTime);
                    $hoursWorked = round($exitCarbon->floatDiffInHours($entryCarbon), 2);

                    $pointageBatch[] = [
                        'utilisateur_id' => $employee->id,
                        'date' => $day,
                        'heure_entree' => $day . ' ' . $entryTime,
                        'heure_sortie' => $day . ' ' . $exitTime,
                        'duree_travail' => $hoursWorked,
                        'absence_justifiee' => false,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                } else {
                    // Absent — some justified, some not
                    $pointageBatch[] = [
                        'utilisateur_id' => $employee->id,
                        'date' => $day,
                        'heure_entree' => null,
                        'heure_sortie' => null,
                        'duree_travail' => 0,
                        'absence_justifiee' => rand(0, 100) < 30, // 30% justified
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                // Flush in batches
                if (count($pointageBatch) >= $batchSize) {
                    DB::table('pointages')->insert($pointageBatch);
                    $pointageBatch = [];
                }
            }
        }

        // Flush remaining
        if (!empty($pointageBatch)) {
            DB::table('pointages')->insert($pointageBatch);
        }

        $totalPointages = Pointage::count();
        $this->command->info("  ✓ {$totalPointages} attendance records created");

        // ────────────────────────────────────────────────────────────
        // 4. Generate Leave Requests (Congés)
        // ────────────────────────────────────────────────────────────
        $this->command->info('🏖️ Generating leave requests...');

        $rhUser = Utilisateur::where('role', Role::RH)->first();
        $leaveTypes = [TypeConge::ANNUEL, TypeConge::ANNUEL, TypeConge::MALADIE, TypeConge::SANS_SOLDE];
        $leaveStatuses = [
            StatutConge::APPROUVE,
            StatutConge::APPROUVE,
            StatutConge::APPROUVE,
            StatutConge::REFUSE,
            StatutConge::EN_ATTENTE,
        ];

        foreach ($employees as $employee) {
            $numLeaves = rand(2, 6);

            for ($l = 0; $l < $numLeaves; $l++) {
                $leaveStart = Carbon::now()->subMonths(rand(0, 5))->subDays(rand(0, 25));
                $leaveDays = rand(1, 5);
                $leaveEnd = $leaveStart->copy()->addDays($leaveDays);

                // Don't create leaves in the future
                if ($leaveStart->isFuture()) continue;

                $status = $leaveStatuses[array_rand($leaveStatuses)];
                $type = $leaveTypes[array_rand($leaveTypes)];

                $motifs = [
                    TypeConge::ANNUEL->value => ['Vacances familiales', 'Repos personnel', 'Voyage', 'Événement familial'],
                    TypeConge::MALADIE->value => ['Grippe', 'Consultation médicale', 'Intervention chirurgicale', 'Repos médical'],
                    TypeConge::SANS_SOLDE->value => ['Raisons personnelles', 'Formation externe', 'Déménagement'],
                ];

                Conge::create([
                    'utilisateur_id' => $employee->id,
                    'type' => $type,
                    'date_debut' => $leaveStart,
                    'date_fin' => $leaveEnd,
                    'statut' => $status,
                    'motif' => $motifs[$type->value][array_rand($motifs[$type->value])],
                    'approuve_par' => $status !== StatutConge::EN_ATTENTE ? $rhUser?->id : null,
                    'motif_refus' => $status === StatutConge::REFUSE ? 'Effectif insuffisant pendant cette période' : null,
                ]);
            }
        }

        $totalConges = Conge::count();
        $this->command->info("  ✓ {$totalConges} leave requests created");

        // ────────────────────────────────────────────────────────────
        // 5. Create Postes
        // ────────────────────────────────────────────────────────────
        $this->command->info('💼 Creating positions...');

        $postes = [
            ['titre' => 'Développeur Full-Stack', 'description' => 'Développement d\'applications web full-stack', 'statut' => 'ACTIF'],
            ['titre' => 'Analyste de Données', 'description' => 'Analyse et visualisation de données', 'statut' => 'ACTIF'],
            ['titre' => 'Chef de Projet', 'description' => 'Gestion et supervision de projets', 'statut' => 'ACTIF'],
            ['titre' => 'Responsable Marketing', 'description' => 'Stratégie et campagnes marketing', 'statut' => 'ACTIF'],
            ['titre' => 'Support Technique N2', 'description' => 'Support technique avancé', 'statut' => 'ACTIF'],
        ];

        foreach ($postes as $p) {
            Poste::firstOrCreate(['titre' => $p['titre']], $p);
        }

        // Create some affectations
        $allPostes = Poste::all();
        $availableEmployees = Utilisateur::where('role', Role::EMPLOYE)->where('actif', true)->get()->shuffle();
        foreach ($allPostes as $idx => $poste) {
            $numAffected = rand(2, 4);
            for ($a = 0; $a < $numAffected; $a++) {
                $emp = $availableEmployees->pop();
                if (!$emp) break;

                Affectation::create([
                    'utilisateur_id' => $emp->id,
                    'poste_id' => $poste->id,
                    'date_debut' => $emp->date_embauche,
                    'date_fin' => null,
                ]);

                $emp->update(['status' => EmployeStatus::AFFECTE]);
            }
        }

        // ────────────────────────────────────────────────────────────
        // 6. Generate Payroll (Paies) — 6 months
        // ────────────────────────────────────────────────────────────
        $this->command->info('💰 Generating payroll records...');

        $paieBatch = [];
        for ($m = 5; $m >= 0; $m--) {
            $periodeDebut = Carbon::now()->subMonths($m)->startOfMonth();
            $periodeFin = Carbon::now()->subMonths($m)->endOfMonth();
            $datePaiement = $periodeFin->copy()->addDays(5);

            foreach ($employees as $employee) {
                $heuresSupp = rand(0, 20);
                $paieData = Paie::calculerPaie((float) $employee->salaire_base, $heuresSupp);

                $statut = $m > 0 ? StatutPaie::PAYE : StatutPaie::GENERE;

                $paieBatch[] = [
                    'utilisateur_id' => $employee->id,
                    'periode_debut' => $periodeDebut->toDateString(),
                    'periode_fin' => $periodeFin->toDateString(),
                    'salaire_brut' => $paieData['salaire_brut'],
                    'taux_horaire' => $paieData['taux_horaire'],
                    'heures_normales' => Paie::STANDARD_MONTHLY_HOURS,
                    'heures_supp' => $heuresSupp,
                    'montant_heures_supp' => $paieData['montant_heures_supp'],
                    'deductions' => $paieData['deductions'],
                    'cnss_employe' => $paieData['cnss_employe'],
                    'cnss_taux' => $paieData['cnss_taux'],
                    'impot_annuel' => $paieData['impot_annuel'],
                    'impot_mensuel' => $paieData['impot_mensuel'],
                    'salaire_net' => $paieData['salaire_net'],
                    'date_paiement' => $statut === StatutPaie::PAYE ? $datePaiement->toDateString() : null,
                    'statut' => $statut->value,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (count($paieBatch) >= $batchSize) {
                    DB::table('paies')->insert($paieBatch);
                    $paieBatch = [];
                }
            }
        }
        if (!empty($paieBatch)) {
            DB::table('paies')->insert($paieBatch);
        }

        $totalPaies = Paie::count();
        $this->command->info("  ✓ {$totalPaies} payroll records created");

        // ────────────────────────────────────────────────────────────
        // 7. Create Job Requests, Posts, and Applications
        // ────────────────────────────────────────────────────────────
        $this->command->info('📝 Creating job posts & applications...');

        $chefUser = Utilisateur::where('role', Role::CHEF_EQUIPE)->first();

        $jobData = [
            [
                'titre' => 'Développeur Python Senior',
                'description' => 'Nous recherchons un développeur Python expérimenté pour notre équipe IA.',
                'skills' => ['Python', 'Machine Learning', 'SQL/PostgreSQL', 'Docker'],
            ],
            [
                'titre' => 'Développeur React Frontend',
                'description' => 'Rejoignez notre équipe frontend pour développer des interfaces modernes.',
                'skills' => ['React', 'TypeScript', 'JavaScript', 'Git'],
            ],
            [
                'titre' => 'Chef de Projet Digital',
                'description' => 'Piloter les projets digitaux de l\'entreprise.',
                'skills' => ['Gestion de Projet', 'Communication', 'Leadership', 'Travail en Equipe'],
            ],
        ];

        foreach ($jobData as $jd) {
            // Create Job Request
            $jobRequest = JobRequest::create([
                'titre' => $jd['titre'],
                'description' => $jd['description'],
                'equipe_id' => $equipes->random()->id,
                'demandeur_id' => $chefUser->id,
                'statut' => JobRequestStatus::APPROVED,
            ]);

            // Create Job Post
            $jobPost = JobPost::create([
                'job_request_id' => $jobRequest->id,
                'titre' => $jd['titre'],
                'description' => $jd['description'],
                'statut' => JobPostStatus::PUBLISHED,
                'published_at' => Carbon::now()->subDays(rand(5, 30)),
                'created_by' => $rhUser?->id,
            ]);

            // Attach required competences
            foreach ($jd['skills'] as $skillName) {
                $comp = Competence::where('nom', $skillName)->first();
                if ($comp) {
                    $jobPost->competences()->attach($comp->id, ['niveau_requis' => rand(2, 4)]);
                }
            }

            // Create applications from random employees
            $applicants = Utilisateur::where('role', Role::EMPLOYE)
                ->where('actif', true)
                ->inRandomOrder()
                ->take(rand(5, 8))
                ->get();

            $motivations = [
                'Je suis très motivé par ce poste et je possède les compétences requises.',
                'Mon expérience correspond parfaitement à ce profil.',
                'Je souhaite évoluer professionnellement et ce poste est une opportunité idéale.',
                'J\'ai travaillé sur des projets similaires et je suis confiant de pouvoir contribuer.',
                'Ce poste correspond à mes aspirations de carrière et à mes compétences techniques.',
            ];

            foreach ($applicants as $applicant) {
                $appStatus = [
                    ApplicationStatus::PENDING,
                    ApplicationStatus::PENDING,
                    ApplicationStatus::REVIEWED,
                    ApplicationStatus::ACCEPTED,
                    ApplicationStatus::REJECTED,
                ];

                JobApplication::create([
                    'job_post_id' => $jobPost->id,
                    'utilisateur_id' => $applicant->id,
                    'statut' => $appStatus[array_rand($appStatus)],
                    'motivation' => $motivations[array_rand($motivations)],
                    'applied_at' => Carbon::now()->subDays(rand(1, 20)),
                ]);
            }
        }

        $this->command->info("  ✓ " . JobPost::count() . " job posts, " . JobApplication::count() . " applications created");

        // ────────────────────────────────────────────────────────────
        // Summary
        // ────────────────────────────────────────────────────────────
        $this->command->info('');
        $this->command->info('✅ FullDataSeeder completed!');
        $this->command->info("   Employees: {$employees->count()}");
        $this->command->info("   Competences: {$competences->count()}");
        $this->command->info("   Teams: {$equipes->count()}");
        $this->command->info("   Attendance records: {$totalPointages}");
        $this->command->info("   Leave requests: {$totalConges}");
        $this->command->info("   Payroll records: {$totalPaies}");
        $this->command->info("   Job posts: " . JobPost::count());
        $this->command->info("   Applications: " . JobApplication::count());
    }

    /**
     * Weighted random selection
     */
    private function weightedRandom(array $items, array $weights): string
    {
        $totalWeight = array_sum($weights);
        $rand = mt_rand(1, $totalWeight);
        $cumulative = 0;

        foreach ($items as $idx => $item) {
            $cumulative += $weights[$idx];
            if ($rand <= $cumulative) {
                return $item;
            }
        }

        return $items[0];
    }
}
