<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Mail\OtpMail;
use App\Models\OtpLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request - Step 1: Validate credentials and send OTP
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // Check rate limiting
        $throttleKey = strtolower($request->email) . '|' . $request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => __('auth.throttle', [
                    'seconds' => $seconds,
                    'minutes' => ceil($seconds / 60),
                ]),
            ]);
        }

        // Find user and validate credentials
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($throttleKey);
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        RateLimiter::clear($throttleKey);

        // Expire any existing unused OTPs for this user
        OtpLog::where('user_id', $user->id)
            ->where('is_used', false)
            ->where('is_expired', false)
            ->update(['is_expired' => true]);

        // Generate 6-digit OTP
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiryMinutes = 10;

        // Get location from IP
        $location = OtpLog::getLocationFromIp($request->ip());

        // Create OTP log with explicit boolean defaults
        $otpLog = new OtpLog();
        $otpLog->user_id = $user->id;
        $otpLog->otp = Hash::make($otp);
        $otpLog->ip_address = $request->ip();
        $otpLog->user_agent = $request->userAgent();
        $otpLog->location = $location;
        $otpLog->is_used = false;
        $otpLog->is_expired = false;
        $otpLog->attempts_used = 0;
        $otpLog->max_attempts = 3;
        $otpLog->expires_at = now()->addMinutes($expiryMinutes);
        $otpLog->save();

        // Send OTP via email
        Mail::to($user->email)->send(new OtpMail($otp, $user->name, $expiryMinutes));

        // Store user ID and remember preference in session for OTP verification step
        $request->session()->put('otp_user_id', $user->id);
        $request->session()->put('otp_log_id', $otpLog->id);
        $request->session()->put('remember', $request->boolean('remember'));
        
        // Force save the session
        $request->session()->save();

        return response()->json([
            'message' => 'OTP sent to your email',
            'requires_otp' => true,
        ]);
    }

    /**
     * Show OTP verification page
     */
    public function showOtpForm(Request $request): Response
    {
        if (!$request->session()->has('otp_user_id')) {
            return redirect()->route('login');
        }

        return Inertia::render('auth/verify-otp', [
            'email' => User::find($request->session()->get('otp_user_id'))->email ?? '',
        ]);
    }

    /**
     * Verify OTP and complete login - Step 2
     */
    public function verifyOtp(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'otp' => 'required|string|size:6',
        ]);

        $userId = $request->session()->get('otp_user_id');
        $otpLogId = $request->session()->get('otp_log_id');

        if (!$userId || !$otpLogId) {
            throw ValidationException::withMessages([
                'otp' => 'Session expired. Please login again.',
            ]);
        }

        $otpLog = OtpLog::find($otpLogId);
        $user = User::find($userId);

        if (!$otpLog || !$user) {
            throw ValidationException::withMessages([
                'otp' => 'Invalid session. Please login again.',
            ]);
        }

        // Check if OTP is still valid
        if (!$otpLog->isValid()) {
            throw ValidationException::withMessages([
                'otp' => 'OTP has expired or exceeded maximum attempts. Please request a new one.',
            ]);
        }

        // Verify OTP
        if (!Hash::check($request->otp, $otpLog->otp)) {
            $otpLog->incrementAttempts();
            
            $attemptsLeft = $otpLog->max_attempts - $otpLog->attempts_used;
            throw ValidationException::withMessages([
                'otp' => "Invalid OTP. You have {$attemptsLeft} attempts remaining.",
            ]);
        }

        // Mark OTP as used
        $otpLog->markAsUsed();

        // Log the user in
        Auth::login($user, $request->session()->get('remember', false));

        $request->session()->regenerate();
        $request->session()->forget(['otp_user_id', 'otp_log_id', 'remember']);

        return response()->json([
            'message' => 'Login successful',
            'redirect' => route('dashboard'),
        ]);
    }

    /**
     * Resend OTP
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $userId = $request->session()->get('otp_user_id');

        if (!$userId) {
            throw ValidationException::withMessages([
                'otp' => 'Session expired. Please login again.',
            ]);
        }

        $user = User::find($userId);

        if (!$user) {
            throw ValidationException::withMessages([
                'otp' => 'Invalid session. Please login again.',
            ]);
        }

        // Expire existing OTPs
        OtpLog::where('user_id', $user->id)
            ->where('is_used', false)
            ->where('is_expired', false)
            ->update(['is_expired' => true]);

        // Generate new OTP
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiryMinutes = 10;

        // Get location from IP
        $location = OtpLog::getLocationFromIp($request->ip());

        // Create OTP log with explicit boolean defaults
        $otpLog = new OtpLog();
        $otpLog->user_id = $user->id;
        $otpLog->otp = Hash::make($otp);
        $otpLog->ip_address = $request->ip();
        $otpLog->user_agent = $request->userAgent();
        $otpLog->location = $location;
        $otpLog->is_used = false;
        $otpLog->is_expired = false;
        $otpLog->attempts_used = 0;
        $otpLog->max_attempts = 3;
        $otpLog->expires_at = now()->addMinutes($expiryMinutes);
        $otpLog->save();

        // Update session with new OTP log ID
        $request->session()->put('otp_log_id', $otpLog->id);

        // Send new OTP via email
        Mail::to($user->email)->send(new OtpMail($otp, $user->name, $expiryMinutes));

        return response()->json([
            'message' => 'New OTP sent to your email',
        ]);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
