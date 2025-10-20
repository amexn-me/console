<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CurrencySettingsController extends Controller
{
    /**
     * Show the currency conversion rates settings page
     */
    public function edit()
    {
        $rates = [
            'sar_to_aed' => Setting::get('currency_rate_sar_to_aed', 1.00),
            'myr_to_aed' => Setting::get('currency_rate_myr_to_aed', 0.82),
        ];

        return Inertia::render('settings/currency', [
            'rates' => $rates,
        ]);
    }

    /**
     * Update currency conversion rates
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'sar_to_aed' => ['required', 'numeric', 'min:0'],
            'myr_to_aed' => ['required', 'numeric', 'min:0'],
        ]);

        Setting::set('currency_rate_sar_to_aed', $validated['sar_to_aed'], 'number');
        Setting::set('currency_rate_myr_to_aed', $validated['myr_to_aed'], 'number');

        return redirect()->route('currency.edit')->with('success', 'Currency conversion rates updated successfully.');
    }
}
