<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropIndex(['employee_id']);
            $table->dropColumn('employee_id');
        });

        Schema::table('payslips', function (Blueprint $table) {
            $table->foreignId('employee_id')->nullable()->after('id');
            $table->index('employee_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropIndex(['employee_id']);
            $table->dropColumn('employee_id');
        });

        Schema::table('payslips', function (Blueprint $table) {
            $table->uuid('employee_id')->after('id');
            $table->index('employee_id');
        });
    }
};
