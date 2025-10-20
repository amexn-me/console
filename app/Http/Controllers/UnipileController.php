<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class UnipileController extends Controller
{
    public function searchLinkedInLeadsFromLead(Request $request, Lead $lead)
    {
        // Load the company relationship
        $company = $lead->company;
        
        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'This lead does not have an associated company.',
            ], 400);
        }
        
        return $this->searchLinkedInLeads($request, $company);
    }

    public function searchLinkedInLeads(Request $request, Company $company)
    {
        // Check if company has LinkedIn company code
        if (empty($company->li_company_code)) {
            return response()->json([
                'success' => false,
                'message' => 'This company does not have a LinkedIn company code configured.',
            ], 400);
        }

        try {
            $apiKey = config('services.unipile.api_key');
            $accountId = config('services.unipile.account_id');
            $apiUrl = config('services.unipile.api_url', 'https://api15.unipile.com:14570');

            // Build LinkedIn URL with company code
            $linkedInUrl = "https://www.linkedin.com/sales/search/people?query=(recentSearchParam%3A(id%3A3977226225%2CdoLogHistory%3Atrue)%2Cfilters%3AList((type%3AREGION%2Cvalues%3AList((id%3A104305776%2CselectionType%3AINCLUDED)))%2C(type%3ACURRENT_TITLE%2Cvalues%3AList((id%3A558%2CselectionType%3AINCLUDED)%2C(id%3A93%2CselectionType%3AINCLUDED)%2C(id%3A3636%2CselectionType%3AINCLUDED)%2C(id%3A192%2CselectionType%3AINCLUDED)%2C(id%3A600%2CselectionType%3AINCLUDED)%2C(id%3A3512%2CselectionType%3AINCLUDED)%2C(id%3A203%2CselectionType%3AINCLUDED)%2C(id%3A333%2CselectionType%3AINCLUDED)%2C(id%3A127%2CselectionType%3AINCLUDED)%2C(id%3A1208%2CselectionType%3AINCLUDED)%2C(id%3A26906%2CselectionType%3AINCLUDED)%2C(id%3A26762%2CselectionType%3AINCLUDED)%2C(id%3A884%2CselectionType%3AINCLUDED)%2C(id%3A10998%2CselectionType%3AINCLUDED)%2C(id%3A7301%2CselectionType%3AINCLUDED)%2C(id%3A204%2CselectionType%3AINCLUDED)%2C(id%3A65%2CselectionType%3AINCLUDED)%2C(id%3A1662%2CselectionType%3AINCLUDED)%2C(id%3A7916%2CselectionType%3AINCLUDED)))%2C(type%3ACURRENT_COMPANY%2Cvalues%3AList((id%3Aurn%253Ali%253Aorganization%253A{$company->li_company_code}%2CselectionType%3AINCLUDED)))))&sessionId=Syy7EFeMQyq59cFB5%2BXDwg%3D%3D&viewAllFilters=true";

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'X-API-KEY' => $apiKey,
                'accept' => 'application/json',
            ])->post("{$apiUrl}/api/v1/linkedin/search?account_id={$accountId}&limit=100", [
                'url' => $linkedInUrl,
            ]);

            // Log::info('Unipile API Response Status: ' . $response->status());
            // Log::info('Unipile API Response Body: ' . $response->body());

            if ($response->successful()) {
                $data = $response->json();
                // Log::info('Unipile API Success - Items Count: ' . count($data['items'] ?? []));
                
                return response()->json([
                    'success' => true,
                    'data' => $data,
                ]);
            }

            Log::error('Unipile API Failed - Status: ' . $response->status());
            Log::error('Unipile API Response Body: ' . $response->body());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch leads from LinkedIn',
                'error' => $response->body(),
            ], 400);

        } catch (\Exception $e) {
            Log::error('Unipile LinkedIn Search Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while searching LinkedIn',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

