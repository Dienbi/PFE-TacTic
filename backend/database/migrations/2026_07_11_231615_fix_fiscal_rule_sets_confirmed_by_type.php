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
        Schema::table('fiscal_rule_sets', function (Blueprint $table) {
            $table->dropColumn('confirmed_by');
        });

        Schema::table('fiscal_rule_sets', function (Blueprint $table) {
            $table->foreignId('confirmed_by')->nullable()->after('confirmed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fiscal_rule_sets', function (Blueprint $table) {
            $table->dropColumn('confirmed_by');
        });

        Schema::table('fiscal_rule_sets', function (Blueprint $table) {
            $table->uuid('confirmed_by')->nullable()->after('confirmed_at');
        });
    }
};
