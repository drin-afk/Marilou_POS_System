<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Public Authentication Route
Route::post('/login', [AuthController::class, 'login']);

// Authenticated & Active User Routes
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    // Current User & Logout
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Products (Both Cashier and Admin can view products for POS checkout)
    Route::get('/products', [ProductController::class, 'index']);

    // Sales Transactions & History (Cashier sees own history; Admin sees all)
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show']);

    // Administrator-Only Routes
    Route::middleware(['role:admin'])->group(function () {
        // User Management
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::patch('/users/{user}/toggle-status', [UserController::class, 'toggleStatus']);

        // Product Management (Add, Edit, Delete/Archive)
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);

        // Void Mistaken Transaction (Rule 5 safe reversal)
        Route::post('/transactions/{transaction}/void', [TransactionController::class, 'void']);

        // Sales Reports & Database Backup Export
        Route::get('/reports/sales', [ReportController::class, 'sales']);
        Route::get('/backup/export', [ReportController::class, 'exportBackup']);
    });
});
