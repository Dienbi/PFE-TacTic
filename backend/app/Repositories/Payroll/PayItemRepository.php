<?php

namespace App\Repositories\Payroll;

use App\Models\PayItem;
use Illuminate\Support\Str;

class PayItemRepository
{
    public function create(array $data): PayItem
    {
        return PayItem::create([
            'id' => $data['id'] ?? Str::uuid(),
            'name' => $data['name'],
            'calculation_type' => $data['calculation_type'] ?? 'fixed_amount',
            'is_taxable' => $data['is_taxable'] ?? true,
            'is_cnss_applicable' => $data['is_cnss_applicable'] ?? true,
            'default_value' => $data['default_value'] ?? null,
            'active' => $data['active'] ?? true,
        ]);
    }

    public function update(string $id, array $data): PayItem
    {
        $payItem = $this->findById($id);
        $payItem->update($data);
        return $payItem->fresh();
    }

    public function findById(string $id): ?PayItem
    {
        return PayItem::find($id);
    }

    public function getAll(): \Illuminate\Database\Eloquent\Collection
    {
        return PayItem::orderBy('name')->get();
    }

    public function getActive(): \Illuminate\Database\Eloquent\Collection
    {
        return PayItem::active()->orderBy('name')->get();
    }

    public function deactivate(string $id): PayItem
    {
        $payItem = $this->findById($id);
        $payItem->update(['active' => false]);
        return $payItem->fresh();
    }

    public function activate(string $id): PayItem
    {
        $payItem = $this->findById($id);
        $payItem->update(['active' => true]);
        return $payItem->fresh();
    }

    public function delete(string $id): bool
    {
        return PayItem::destroy($id);
    }
}
