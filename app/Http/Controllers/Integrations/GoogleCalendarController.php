<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Models\GoogleCalendarAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class GoogleCalendarController extends Controller
{
    public function index()
    {
        $accounts = GoogleCalendarAccount::with('user')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('integrations/google-calendar', [
            'accounts' => $accounts,
            'hasGoogleAuth' => Auth::user()->googleCalendarAccount()->exists(),
        ]);
    }

    public function toggleActive(Request $request, GoogleCalendarAccount $account)
    {
        $request->validate([
            'is_active' => 'required|boolean',
        ]);

        $account->update([
            'is_active' => $request->is_active,
        ]);

        return back();
    }

    public function toggleStaffCalendar(Request $request, GoogleCalendarAccount $account)
    {
        $request->validate([
            'is_staff_calendar' => 'required|boolean',
        ]);

        $account->update([
            'is_staff_calendar' => $request->is_staff_calendar,
        ]);

        return back();
    }

    public function destroy(GoogleCalendarAccount $account)
    {
        $account->delete();

        return back();
    }
}

