<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', [HealthController::class, 'show']);

Route::prefix('/api')->group(function () {
    Route::post('/users', [UserController::class, 'store']);
});
