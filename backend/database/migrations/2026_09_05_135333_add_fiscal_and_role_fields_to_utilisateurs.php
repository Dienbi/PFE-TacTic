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
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->integer('disabled_children_count')->default(0)->after('children_count');
            $table->integer('student_non_scholarship_children_count')->default(0)->after('disabled_children_count');
            $table->boolean('head_of_family')->default(false)->after('student_non_scholarship_children_count');
            $table->uuid('role_profile_id')->nullable()->after('head_of_family');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropColumn(['disabled_children_count', 'student_non_scholarship_children_count', 'head_of_family', 'role_profile_id']);
        });
    }
};
