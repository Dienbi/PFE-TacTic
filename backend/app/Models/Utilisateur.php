<?php

namespace App\Models;

use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Enums\TypeContrat;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class Utilisateur extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable, SoftDeletes;

    protected $table = 'utilisateurs';

    protected $fillable = [
        'matricule',
        'nom',
        'prenom',
        'email',
        'password',
        'telephone',
        'adresse',
        'date_embauche',
        'type_contrat',
        'salaire_base',
        'status',
        'role',
        'actif',
        'solde_conge',
        'equipe_id',
        'date_derniere_connexion',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'date_embauche' => 'date',
        'date_derniere_connexion' => 'datetime',
        'actif' => 'boolean',
        'salaire_base' => 'decimal:2',
        'type_contrat' => TypeContrat::class,
        'status' => EmployeStatus::class,
        'role' => Role::class,
    ];

    // JWT Methods
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'role' => $this->role,
            'matricule' => $this->matricule,
        ];
    }

    // Relationships
    public function equipe()
    {
        return $this->belongsTo(Equipe::class);
    }

    public function equipeGeree()
    {
        return $this->hasOne(Equipe::class, 'chef_equipe_id');
    }

    public function pointages()
    {
        return $this->hasMany(Pointage::class);
    }

    public function conges()
    {
        return $this->hasMany(Conge::class);
    }

    public function congesApprouves()
    {
        return $this->hasMany(Conge::class, 'approuve_par');
    }

    public function paies()
    {
        return $this->hasMany(Paie::class);
    }

    public function affectations()
    {
        return $this->hasMany(Affectation::class);
    }

    public function competences()
    {
        return $this->belongsToMany(Competence::class, 'utilisateur_competence')
            ->withPivot('niveau')
            ->withTimestamps();
    }

    // Accessors
    public function getNomCompletAttribute()
    {
        return $this->prenom . ' ' . $this->nom;
    }

    // Scopes
    public function scopeActif($query)
    {
        return $query->where('actif', true);
    }

    public function scopeByRole($query, Role $role)
    {
        return $query->where('role', $role);
    }

    public function scopeDisponible($query)
    {
        return $query->where('status', EmployeStatus::DISPONIBLE);
    }

    // Helper methods
    public function isRH(): bool
    {
        return $this->role === Role::RH;
    }

    public function isChefEquipe(): bool
    {
        return $this->role === Role::CHEF_EQUIPE;
    }

    public function isEmploye(): bool
    {
        return $this->role === Role::EMPLOYE;
    }

    public function hasRole(Role $role): bool
    {
        return $this->role === $role;
    }
}
