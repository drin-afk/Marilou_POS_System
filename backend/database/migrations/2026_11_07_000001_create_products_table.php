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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('barcode', 64)->nullable()->unique();
            $table->string('category', 80);
            $table->string('unit', 30)->default('pc');
            $table->decimal('price', 10, 2)->unsigned();
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->softDeletes();
            $table->timestamps();

            $table->index('category');
            $table->index('name');
            $table->index('deleted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
