<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!$request->user()) {
            return redirect()->route('login');
        }

        // Super admin has access to everything
        if ($request->user()->isSuperAdmin()) {
            return $next($request);
        }

        // Check if user has any of the required roles
        if (empty($roles) || $request->user()->hasAnyRole($roles)) {
            return $next($request);
        }

        // If user doesn't have required role, abort with 403
        abort(403, 'Unauthorized action.');
    }
}

