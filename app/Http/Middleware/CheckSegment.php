<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSegment
{
    /**
     * Handle an incoming request.
     * Checks if user belongs to a specific segment (sales, dev, project)
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$segments): Response
    {
        if (!$request->user()) {
            return redirect()->route('login');
        }

        // Super admin has access to everything
        if ($request->user()->isSuperAdmin()) {
            return $next($request);
        }

        $userSegment = $request->user()->getSegment();

        // Check if user's segment matches any of the required segments
        if (empty($segments) || in_array($userSegment, $segments)) {
            return $next($request);
        }

        // If user doesn't belong to required segment, abort with 403
        abort(403, 'Unauthorized action. You do not have access to this segment.');
    }
}

