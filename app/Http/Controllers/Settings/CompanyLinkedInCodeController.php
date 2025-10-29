<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class CompanyLinkedInCodeController extends Controller
{
    /**
     * Show the bulk update page
     */
    public function edit()
    {
        return Inertia::render('settings/company-linkedin-code', [
            'stats' => [
                'total_companies' => Company::count(),
                'with_li_code' => Company::whereNotNull('li_company_code')->count(),
            ]
        ]);
    }

    /**
     * Preview the CSV file before updating
     */
    public function preview(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240', // 10MB max
        ]);

        try {
            $file = $request->file('file');
            $data = Excel::toArray([], $file)[0]; // Get first sheet
            
            // Remove header row
            $headers = array_shift($data);
            
            // Validate headers
            if (count($headers) < 2 || 
                strtolower(trim($headers[0])) !== 'id' || 
                strtolower(trim($headers[1])) !== 'li_company_code') {
                return response()->json([
                    'error' => 'Invalid file format. CSV must have headers: id,li_company_code'
                ], 422);
            }

            $preview = [];
            $errors = [];
            $totalRows = 0;
            $validRows = 0;

            foreach ($data as $rowIndex => $row) {
                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                $totalRows++;
                $rowNumber = $rowIndex + 2; // +2 because we removed header and arrays are 0-indexed

                $companyId = trim($row[0] ?? '');
                $liCompanyCode = trim($row[1] ?? '');

                // Validate required fields
                if (empty($companyId)) {
                    $errors[] = "Row {$rowNumber}: Company ID is required";
                    continue;
                }

                // Check if company exists
                $company = Company::find($companyId);
                
                if (!$company) {
                    $errors[] = "Row {$rowNumber}: Company with ID '{$companyId}' not found";
                    continue;
                }

                $validRows++;

                $preview[] = [
                    'row' => $rowNumber,
                    'company_id' => $companyId,
                    'company_name' => $company->name,
                    'current_li_code' => $company->li_company_code,
                    'new_li_code' => $liCompanyCode ?: null,
                    'will_update' => $company->li_company_code !== $liCompanyCode,
                ];
            }

            return response()->json([
                'preview' => $preview,
                'errors' => $errors,
                'summary' => [
                    'total_rows' => $totalRows,
                    'valid_rows' => $validRows,
                    'error_rows' => count($errors),
                    'will_update' => count(array_filter($preview, fn($p) => $p['will_update'])),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error processing file: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Confirm and execute the bulk update
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        try {
            $file = $request->file('file');
            $data = Excel::toArray([], $file)[0];
            
            // Remove header row
            $headers = array_shift($data);
            
            // Validate headers
            if (count($headers) < 2 || 
                strtolower(trim($headers[0])) !== 'id' || 
                strtolower(trim($headers[1])) !== 'li_company_code') {
                return back()->with('error', 'Invalid file format. CSV must have headers: id,li_company_code');
            }

            $updated = 0;
            $skipped = 0;
            $errors = [];

            foreach ($data as $rowIndex => $row) {
                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                $rowNumber = $rowIndex + 2;
                $companyId = trim($row[0] ?? '');
                $liCompanyCode = trim($row[1] ?? '');

                if (empty($companyId)) {
                    $errors[] = "Row {$rowNumber}: Company ID is required";
                    continue;
                }

                try {
                    $company = Company::find($companyId);
                    
                    if (!$company) {
                        $errors[] = "Row {$rowNumber}: Company with ID '{$companyId}' not found";
                        $skipped++;
                        continue;
                    }

                    // Only update if value changed
                    if ($company->li_company_code !== $liCompanyCode) {
                        $company->li_company_code = $liCompanyCode ?: null;
                        $company->save();
                        $updated++;
                    } else {
                        $skipped++;
                    }

                } catch (\Exception $e) {
                    $errors[] = "Row {$rowNumber}: Error updating - " . $e->getMessage();
                    $skipped++;
                    continue;
                }
            }

            $message = "Bulk update completed: {$updated} company(ies) updated";
            if ($skipped > 0) {
                $message .= ", {$skipped} skipped";
            }
            if (count($errors) > 0) {
                $message .= ". " . count($errors) . " error(s) occurred";
            }

            return back()->with('success', $message);

        } catch (\Exception $e) {
            return back()->with('error', 'Error processing file: ' . $e->getMessage());
        }
    }
}

