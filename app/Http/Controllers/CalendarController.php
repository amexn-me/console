<?php

namespace App\Http\Controllers;

use App\Models\GoogleCalendarAccount;
use Google\Client;
use Google\Service\Calendar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;

class CalendarController extends Controller
{
    private function getGoogleClient()
    {
        $client = new Client();
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setRedirectUri(config('services.google.redirect_uri'));
        $client->addScope(Calendar::CALENDAR);
        $client->addScope('https://www.googleapis.com/auth/userinfo.email');
        $client->addScope('https://www.googleapis.com/auth/userinfo.profile');
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        
        return $client;
    }

    public function index()
    {
        $accounts = GoogleCalendarAccount::where('is_active', true)
            ->where('is_staff_calendar', true)
            ->with('user')
            ->get();

        return Inertia::render('Calendar/Index', [
            'calendarAccounts' => $accounts,
            'hasGoogleAuth' => Auth::user()->googleCalendarAccount()->exists(),
        ]);
    }

    public function meetings()
    {
        $accounts = GoogleCalendarAccount::where('is_active', true)
            ->where('is_staff_calendar', true)
            ->with('user')
            ->get();

        return Inertia::render('Meetings/Index', [
            'calendarAccounts' => $accounts,
            'hasGoogleAuth' => Auth::user()->googleCalendarAccount()->exists(),
        ]);
    }

    public function redirectToGoogle()
    {
        $client = $this->getGoogleClient();
        $authUrl = $client->createAuthUrl();
        
        return redirect($authUrl);
    }

    public function handleGoogleCallback(Request $request)
    {
        if (!$request->has('code')) {
            return $this->closePopupWithMessage('Failed to authenticate with Google', 'error');
        }

        try {
            $client = $this->getGoogleClient();
            $token = $client->fetchAccessTokenWithAuthCode($request->code);

            if (isset($token['error'])) {
                throw new \Exception($token['error']);
            }

            $client->setAccessToken($token);
            
            // Get user info from Google
            $oauth = new \Google\Service\Oauth2($client);
            $userInfo = $oauth->userinfo->get();

            // Store or update the account
            GoogleCalendarAccount::updateOrCreate(
                [
                    'user_id' => Auth::id(),
                    'email' => $userInfo->email,
                ],
                [
                    'name' => $userInfo->name,
                    'access_token' => $token['access_token'],
                    'refresh_token' => $token['refresh_token'] ?? null,
                    'token_expires_at' => isset($token['expires_in']) 
                        ? Carbon::now()->addSeconds($token['expires_in']) 
                        : null,
                    'is_active' => true,
                ]
            );

            return $this->closePopupWithMessage('Google Calendar connected successfully!', 'success');
        } catch (\Exception $e) {
            return $this->closePopupWithMessage('Failed to connect: ' . $e->getMessage(), 'error');
        }
    }

    private function closePopupWithMessage($message, $type = 'success')
    {
        $bgColor = $type === 'success' ? '#10b981' : '#ef4444';
        $icon = $type === 'success' ? '✓' : '✗';
        
        return response()->make("
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authentication Complete</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .container {
                        background: white;
                        padding: 3rem;
                        border-radius: 1rem;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                        text-align: center;
                        max-width: 400px;
                    }
                    .icon {
                        width: 64px;
                        height: 64px;
                        background: {$bgColor};
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 1.5rem;
                        font-size: 2rem;
                        color: white;
                    }
                    h1 {
                        color: #1f2937;
                        margin: 0 0 0.5rem;
                        font-size: 1.5rem;
                    }
                    p {
                        color: #6b7280;
                        margin: 0 0 1.5rem;
                    }
                    .closing {
                        font-size: 0.875rem;
                        color: #9ca3af;
                    }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='icon'>{$icon}</div>
                    <h1>" . htmlspecialchars($message) . "</h1>
                    <p class='closing'>This window will close automatically...</p>
                </div>
                <script>
                    // Close the popup after 2 seconds
                    setTimeout(function() {
                        window.close();
                    }, 2000);
                </script>
            </body>
            </html>
        ");
    }

    public function getEvents(Request $request)
    {
        $request->validate([
            'start' => 'required|date',
            'end' => 'required|date',
            'account_ids' => 'nullable|array',
            'account_ids.*' => 'integer',
        ]);

        $accountIds = $request->input('account_ids', []);

        $accounts = GoogleCalendarAccount::where('is_active', true)
            ->where('is_staff_calendar', true)
            ->when(!empty($accountIds), function ($query) use ($accountIds) {
                return $query->whereIn('id', $accountIds);
            })
            ->get();

        $allEvents = [];

        foreach ($accounts as $account) {
            try {
                $client = $this->getGoogleClient();
                
                // Check if token is expired and refresh if needed
                if ($account->isTokenExpired() && $account->refresh_token) {
                    $client->refreshToken($account->refresh_token);
                    $newToken = $client->getAccessToken();
                    
                    $account->update([
                        'access_token' => $newToken['access_token'],
                        'token_expires_at' => Carbon::now()->addSeconds($newToken['expires_in']),
                    ]);
                }

                $client->setAccessToken($account->access_token);
                $service = new Calendar($client);

                $calendarId = $account->calendar_id ?? 'primary';
                
                $optParams = [
                    'timeMin' => Carbon::parse($request->start)->toIso8601String(),
                    'timeMax' => Carbon::parse($request->end)->toIso8601String(),
                    'singleEvents' => true,
                    'orderBy' => 'startTime',
                ];

                $events = $service->events->listEvents($calendarId, $optParams);

                foreach ($events->getItems() as $event) {
                    $start = $event->start->dateTime ?? $event->start->date;
                    $end = $event->end->dateTime ?? $event->end->date;

                    $allEvents[] = [
                        'id' => $event->getId(),
                        'title' => $event->getSummary(),
                        'start' => $start,
                        'end' => $end,
                        'description' => $event->getDescription(),
                        'location' => $event->getLocation(),
                        'attendees' => $event->getAttendees(),
                        'meetLink' => $event->getHangoutLink(),
                        'accountId' => $account->id,
                        'accountName' => $account->name,
                        'accountEmail' => $account->email,
                        'backgroundColor' => $this->getColorForAccount($account->id),
                    ];
                }
            } catch (\Exception $e) {
                \Log::error('Failed to fetch events for account ' . $account->id . ': ' . $e->getMessage());
                continue;
            }
        }

        return response()->json([
            'events' => $allEvents,
        ]);
    }

    public function createEvent(Request $request)
    {
        $request->validate([
            'account_id' => 'required|exists:google_calendar_accounts,id',
            'title' => 'required|string',
            'start' => 'required|date',
            'end' => 'required|date|after:start',
            'description' => 'nullable|string',
            'location' => 'nullable|string',
            'attendees' => 'nullable|array',
            'attendees.*.email' => 'required_with:attendees|email',
        ]);

        try {
            $account = GoogleCalendarAccount::findOrFail($request->account_id);
            
            $client = $this->getGoogleClient();
            
            // Refresh token if expired
            if ($account->isTokenExpired() && $account->refresh_token) {
                $client->refreshToken($account->refresh_token);
                $newToken = $client->getAccessToken();
                
                $account->update([
                    'access_token' => $newToken['access_token'],
                    'token_expires_at' => Carbon::now()->addSeconds($newToken['expires_in']),
                ]);
            }

            $client->setAccessToken($account->access_token);
            $service = new Calendar($client);

            $event = new \Google\Service\Calendar\Event([
                'summary' => $request->title,
                'description' => $request->description,
                'location' => $request->location,
                'start' => [
                    'dateTime' => Carbon::parse($request->start)->toIso8601String(),
                    'timeZone' => config('app.timezone'),
                ],
                'end' => [
                    'dateTime' => Carbon::parse($request->end)->toIso8601String(),
                    'timeZone' => config('app.timezone'),
                ],
                'conferenceData' => [
                    'createRequest' => [
                        'requestId' => uniqid(),
                        'conferenceSolutionKey' => [
                            'type' => 'hangoutsMeet',
                        ],
                    ],
                ],
            ]);

            // Add attendees if provided
            if ($request->attendees) {
                $attendees = array_map(function ($attendee) {
                    return ['email' => $attendee['email']];
                }, $request->attendees);
                $event->setAttendees($attendees);
            }

            $calendarId = $account->calendar_id ?? 'primary';
            $createdEvent = $service->events->insert($calendarId, $event, [
                'conferenceDataVersion' => 1,
            ]);

            return response()->json([
                'success' => true,
                'event' => [
                    'id' => $createdEvent->getId(),
                    'title' => $createdEvent->getSummary(),
                    'start' => $createdEvent->start->dateTime,
                    'end' => $createdEvent->end->dateTime,
                    'meetLink' => $createdEvent->getHangoutLink(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create event: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function updateEvent(Request $request, $eventId)
    {
        $request->validate([
            'account_id' => 'required|exists:google_calendar_accounts,id',
            'title' => 'required|string',
            'start' => 'required|date',
            'end' => 'required|date|after:start',
            'description' => 'nullable|string',
            'location' => 'nullable|string',
        ]);

        try {
            $account = GoogleCalendarAccount::findOrFail($request->account_id);
            
            $client = $this->getGoogleClient();
            
            if ($account->isTokenExpired() && $account->refresh_token) {
                $client->refreshToken($account->refresh_token);
                $newToken = $client->getAccessToken();
                
                $account->update([
                    'access_token' => $newToken['access_token'],
                    'token_expires_at' => Carbon::now()->addSeconds($newToken['expires_in']),
                ]);
            }

            $client->setAccessToken($account->access_token);
            $service = new Calendar($client);

            $calendarId = $account->calendar_id ?? 'primary';
            $event = $service->events->get($calendarId, $eventId);

            $event->setSummary($request->title);
            $event->setDescription($request->description);
            $event->setLocation($request->location);
            $event->setStart(new \Google\Service\Calendar\EventDateTime([
                'dateTime' => Carbon::parse($request->start)->toIso8601String(),
                'timeZone' => config('app.timezone'),
            ]));
            $event->setEnd(new \Google\Service\Calendar\EventDateTime([
                'dateTime' => Carbon::parse($request->end)->toIso8601String(),
                'timeZone' => config('app.timezone'),
            ]));

            $updatedEvent = $service->events->update($calendarId, $eventId, $event);

            return response()->json([
                'success' => true,
                'event' => [
                    'id' => $updatedEvent->getId(),
                    'title' => $updatedEvent->getSummary(),
                    'start' => $updatedEvent->start->dateTime,
                    'end' => $updatedEvent->end->dateTime,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update event: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function deleteEvent(Request $request, $eventId)
    {
        $request->validate([
            'account_id' => 'required|exists:google_calendar_accounts,id',
        ]);

        try {
            $account = GoogleCalendarAccount::findOrFail($request->account_id);
            
            $client = $this->getGoogleClient();
            
            if ($account->isTokenExpired() && $account->refresh_token) {
                $client->refreshToken($account->refresh_token);
                $newToken = $client->getAccessToken();
                
                $account->update([
                    'access_token' => $newToken['access_token'],
                    'token_expires_at' => Carbon::now()->addSeconds($newToken['expires_in']),
                ]);
            }

            $client->setAccessToken($account->access_token);
            $service = new Calendar($client);

            $calendarId = $account->calendar_id ?? 'primary';
            $service->events->delete($calendarId, $eventId);

            return response()->json([
                'success' => true,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete event: ' . $e->getMessage(),
            ], 500);
        }
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

    private function getColorForAccount($accountId)
    {
        $colors = [
            '#3b82f6', // blue
            '#10b981', // green
            '#f59e0b', // amber
            '#ef4444', // red
            '#8b5cf6', // purple
            '#ec4899', // pink
            '#14b8a6', // teal
            '#f97316', // orange
        ];

        return $colors[$accountId % count($colors)];
    }
}
