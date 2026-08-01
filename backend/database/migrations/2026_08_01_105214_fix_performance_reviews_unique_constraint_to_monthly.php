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
        Schema::table('performance_reviews', function (Blueprint $table) {
            // Drop the old exact-date unique constraint
            $table->dropUnique('unique_monthly_feedback');

            // Add computed columns for year and month (PostgreSQL syntax)
            $table->unsignedInteger('review_year')->storedAs('EXTRACT(YEAR FROM review_date)::integer')->after('review_date');
            $table->unsignedTinyInteger('review_month')->storedAs('EXTRACT(MONTH FROM review_date)::integer')->after('review_year');

            // Add unique constraint on employee, chef, year, month
            $table->unique(['utilisateur_id', 'chef_id', 'review_year', 'review_month'], 'unique_monthly_feedback');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('performance_reviews', function (Blueprint $table) {
            // Drop the new monthly unique constraint
            $table->dropUnique('unique_monthly_feedback');

            // Drop the computed columns
            $table->dropColumn('review_year');
            $table->dropColumn('review_month');

            // Restore the old exact-date unique constraint
            $table->unique(['utilisateur_id', 'chef_id', 'review_date'], 'unique_monthly_feedback');
        });
    }
};
