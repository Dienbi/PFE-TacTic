<?php

namespace App\Repositories;

use App\Models\RoleProfile;
use Illuminate\Support\Str;

class RoleProfileRepository
{
    public function all()
    {
        return RoleProfile::with('allowances')->get();
    }

    public function find($id)
    {
        return RoleProfile::with('allowances')->findOrFail($id);
    }

    public function findByName($name)
    {
        return RoleProfile::where('name', $name)->first();
    }

    public function search($query)
    {
        return RoleProfile::where('name', 'like', "%{$query}%")
            ->orWhere('label', 'like', "%{$query}%")
            ->with('allowances')
            ->get();
    }

    public function create(array $data)
    {
        $data['id'] = (string) Str::uuid();
        $data['label'] = $this->generateLabel($data);

        return RoleProfile::create($data);
    }

    public function update($id, array $data)
    {
        $profile = $this->find($id);

        // Regenerate label if relevant fields changed
        $relevantFields = ['name', 'horaire_type', 'salary_type', 'weekly_hours'];
        $labelNeedsUpdate = false;
        foreach ($relevantFields as $field) {
            if (isset($data[$field]) && $data[$field] !== $profile->$field) {
                $labelNeedsUpdate = true;
                break;
            }
        }

        if ($labelNeedsUpdate) {
            $data['label'] = $this->generateLabel(array_merge($profile->toArray(), $data));
        }

        $profile->update($data);
        return $profile->fresh();
    }

    public function delete($id)
    {
        $profile = $this->find($id);
        $profile->delete();
        return $profile;
    }

    public function getEmployees($id)
    {
        return RoleProfile::findOrFail($id)->employees;
    }

    private function generateLabel(array $data): string
    {
        $name = $data['name'] ?? '';
        $horaireType = $data['horaire_type'] ?? '';
        $salaryType = $data['salary_type'] ?? '';
        $weeklyHours = $data['weekly_hours'] ?? null;

        $label = "{$name} · {$horaireType} · {$salaryType}";
        if ($weeklyHours) {
            $label .= " · {$weeklyHours}h";
        }

        return $label;
    }
}
