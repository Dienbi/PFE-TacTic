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
            $table->dropColumn('generated_by');
        });

        Schema::table('payslips', function (Blueprint $table) {
            $table->foreignId('generated_by')->nullable()->after('generated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn('generated_by');
        });

        Schema::table('payslips', function (Blueprint $table) {
            $table->uuid('generated_by')->nullable()->after('generated_at');
        });
    }
};
