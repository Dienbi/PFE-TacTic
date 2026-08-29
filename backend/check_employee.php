<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Employe Test Data ===" . PHP_EOL;
$emp = \App\Models\Utilisateur::where('email', 'employe@tactic.com')->first();
if ($emp) {
    echo 'ID: ' . $emp->id . PHP_EOL;
    echo 'Email: ' . $emp->email . PHP_EOL;
    echo 'Marital Status: ' . ($emp->marital_status ?? 'NULL') . PHP_EOL;
    echo 'Children Count: ' . ($emp->children_count ?? 'NULL') . PHP_EOL;
} else {
    echo 'Employee not found' . PHP_EOL;
}

echo PHP_EOL . "=== Fiscal Profile (Before Update) ===" . PHP_EOL;
if ($emp) {
    $profile = \App\Models\EmployeeFiscalProfile::where('employee_id', $emp->id)->first();
    if ($profile) {
        echo 'Marital Status: ' . $profile->marital_status . PHP_EOL;
        echo 'Children Count: ' . $profile->children_count . PHP_EOL;
        echo 'Disabled Children: ' . $profile->disabled_children_count . PHP_EOL;
        echo 'Student Children: ' . $profile->student_non_scholarship_children_count . PHP_EOL;
        
        echo PHP_EOL . "=== Updating Fiscal Profile ===" . PHP_EOL;
        $profile->marital_status = $emp->marital_status === 'married' ? 'head_of_household' : $emp->marital_status;
        $profile->children_count = $emp->children_count;
        $profile->save();
        echo 'Updated marital_status to: ' . $profile->marital_status . PHP_EOL;
        echo 'Updated children_count to: ' . $profile->children_count . PHP_EOL;
    } else {
        echo 'No fiscal profile found' . PHP_EOL;
    }
}
