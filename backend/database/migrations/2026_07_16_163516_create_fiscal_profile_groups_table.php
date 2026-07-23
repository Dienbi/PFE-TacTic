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
        Schema::create('fiscal_profile_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('gender', ['male', 'female']);
            $table->enum('marital_status', ['single', 'married', 'divorced', 'widowed']);
            $table->boolean('head_of_family');
            $table->integer('children_count');
            $table->integer('disabled_children_count')->default(0);
            $table->integer('student_non_scholarship_children_count')->default(0);
            $table->text('label');
            $table->timestamps();

            $table->unique(['gender', 'marital_status', 'head_of_family', 'children_count', 'disabled_children_count', 'student_non_scholarship_children_count'], 'fiscal_profile_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fiscal_profile_groups');
    }
};
