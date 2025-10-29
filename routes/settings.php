<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\CurrencySettingsController;
use App\Http\Controllers\Settings\CompanyLinkedInCodeController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');

    // Currency conversion rates - super_admin only
    Route::middleware('super_admin')->group(function () {
        Route::get('settings/currency', [CurrencySettingsController::class, 'edit'])->name('currency.edit');
        Route::put('settings/currency', [CurrencySettingsController::class, 'update'])->name('currency.update');
        
        // Company LinkedIn Code Bulk Update - super_admin only
        Route::get('settings/company-linkedin-code', [CompanyLinkedInCodeController::class, 'edit'])->name('company-linkedin-code.edit');
        Route::post('settings/company-linkedin-code/preview', [CompanyLinkedInCodeController::class, 'preview'])->name('company-linkedin-code.preview');
        Route::post('settings/company-linkedin-code/update', [CompanyLinkedInCodeController::class, 'update'])->name('company-linkedin-code.update');
    });
});
