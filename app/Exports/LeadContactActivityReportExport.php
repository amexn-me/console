<?php

namespace App\Exports;

use App\Models\Campaign;
use App\Models\Lead;
use App\Models\Contact;
use App\Models\Activity;
use App\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class LeadContactActivityReportExport implements FromCollection, WithHeadings, WithTitle, WithStyles, ShouldAutoSize
{
    protected $campaignId;
    protected $startDate;
    protected $endDate;
    protected $campaignName;

    public function __construct($campaignId, $startDate, $endDate, $campaignName)
    {
        $this->campaignId = $campaignId;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->campaignName = $campaignName;
    }

    public function collection()
    {
        // Get all leads in this campaign with relationships
        $leads = Lead::where('campaign_id', $this->campaignId)
            ->with(['company', 'agent'])
            ->orderBy('company_id')
            ->get();

        // Get all company IDs for these leads
        $companyIds = $leads->pluck('company_id')->unique()->toArray();
        $leadIds = $leads->pluck('id')->toArray();
        
        // Count contacts per company
        $contactCounts = Contact::whereIn('company_id', $companyIds)
            ->select('company_id', \DB::raw('COUNT(*) as total'))
            ->groupBy('company_id')
            ->pluck('total', 'company_id');

        // Count activities in date range per lead
        $activitiesInRange = Activity::whereIn('lead_id', $leadIds)
            ->whereBetween('created_at', [
                $this->startDate . ' 00:00:00',
                $this->endDate . ' 23:59:59'
            ])
            ->select('lead_id', \DB::raw('COUNT(*) as total'))
            ->groupBy('lead_id')
            ->pluck('total', 'lead_id');

        // Count unique contacts with activities in date range per lead
        $contactsWithActivity = Activity::whereIn('lead_id', $leadIds)
            ->whereNotNull('contact_id')
            ->whereBetween('created_at', [
                $this->startDate . ' 00:00:00',
                $this->endDate . ' 23:59:59'
            ])
            ->select('lead_id', \DB::raw('COUNT(DISTINCT contact_id) as total'))
            ->groupBy('lead_id')
            ->pluck('total', 'lead_id');

        // Get activities by agent in date range per lead
        $activitiesByAgent = Activity::whereIn('lead_id', $leadIds)
            ->whereBetween('created_at', [
                $this->startDate . ' 00:00:00',
                $this->endDate . ' 23:59:59'
            ])
            ->with('agent')
            ->select('lead_id', 'agent_id', \DB::raw('COUNT(*) as total'))
            ->groupBy('lead_id', 'agent_id')
            ->get()
            ->groupBy('lead_id');

        // Get conversation methods breakdown per lead
        $conversationMethodsData = Activity::whereIn('lead_id', $leadIds)
            ->whereNotNull('conversation_method')
            ->whereBetween('created_at', [
                $this->startDate . ' 00:00:00',
                $this->endDate . ' 23:59:59'
            ])
            ->select(
                'lead_id', 
                'conversation_method',
                \DB::raw('COUNT(*) as total'),
                \DB::raw("SUM(CASE WHEN conversation_connected = 'Yes' THEN 1 ELSE 0 END) as connected")
            )
            ->groupBy('lead_id', 'conversation_method')
            ->get()
            ->groupBy('lead_id');

        // Get last activity date per lead
        $lastActivityDates = Activity::whereIn('lead_id', $leadIds)
            ->select('lead_id', \DB::raw('MAX(created_at) as last_activity'))
            ->groupBy('lead_id')
            ->pluck('last_activity', 'lead_id');

        // Get leads with stage changes in period
        $stageChanges = Activity::whereIn('lead_id', $leadIds)
            ->whereIn('activity_type', ['stage_changed', 'stage_update'])
            ->whereBetween('created_at', [
                $this->startDate . ' 00:00:00',
                $this->endDate . ' 23:59:59'
            ])
            ->pluck('lead_id')
            ->unique()
            ->flip()
            ->toArray();

        $data = collect();

        foreach ($leads as $lead) {
            $totalContacts = $contactCounts->get($lead->company_id, 0);
            $contactsActive = $contactsWithActivity->get($lead->id, 0);
            $activitiesCount = $activitiesInRange->get($lead->id, 0);
            
            // Build agent breakdown
            $agentActivities = $activitiesByAgent->get($lead->id, collect());
            $agentBreakdown = $agentActivities->map(function($activity) {
                $agentName = $activity->agent ? $activity->agent->name : 'Unknown';
                return $agentName . ': ' . $activity->total;
            })->implode(', ') ?: 'None';

            // Build conversation methods breakdown - split into attempted and connected
            $conversationMethods = $conversationMethodsData->get($lead->id, collect());
            $methodsMap = $conversationMethods->mapWithKeys(function($method) {
                return [
                    $method->conversation_method . '_attempted' => $method->total,
                    $method->conversation_method . '_connected' => $method->connected
                ];
            });
            
            // Get each method's data
            $callAttempted = $methodsMap->get('Call_attempted', 0);
            $callConnected = $methodsMap->get('Call_connected', 0);
            $whatsappAttempted = $methodsMap->get('WhatsApp_attempted', 0);
            $whatsappConnected = $methodsMap->get('WhatsApp_connected', 0);
            $linkedinAttempted = $methodsMap->get('LinkedIn_attempted', 0);
            $linkedinConnected = $methodsMap->get('LinkedIn_connected', 0);
            $emailAttempted = $methodsMap->get('Email_attempted', 0);
            $emailConnected = $methodsMap->get('Email_connected', 0);
            $teamsChatAttempted = $methodsMap->get('Teams Chat_attempted', 0);
            $teamsChatConnected = $methodsMap->get('Teams Chat_connected', 0);
            $otherAttempted = $methodsMap->get('Other_attempted', 0);
            $otherConnected = $methodsMap->get('Other_connected', 0);

            // Calculate total connection rate
            $totalAttempts = $conversationMethods->sum('total');
            $totalConnected = $conversationMethods->sum('connected');
            $connectionRate = $totalAttempts > 0 ? round(($totalConnected / $totalAttempts) * 100, 1) . '%' : '-';

            // Last activity date
            $lastActivityDate = $lastActivityDates->get($lead->id);
            $lastContactedDate = $lastActivityDate ? \Carbon\Carbon::parse($lastActivityDate)->format('Y-m-d') : 'Never';
            $daysSinceContact = $lastActivityDate ? now()->diffInDays(\Carbon\Carbon::parse($lastActivityDate)) : '-';

            // Stage changed in period
            $stageChangedInPeriod = isset($stageChanges[$lead->id]);

            // Analysis
            $analysis = [];
            
            if ($activitiesCount === 0) {
                $analysis[] = 'No follow-up in selected period';
            } else {
                if ($contactsActive === 0) {
                    $analysis[] = 'Activities logged but no contacts engaged';
                }
            }
            
            if (!$stageChangedInPeriod && $activitiesCount > 0) {
                $analysis[] = 'Activities logged but stage not progressed';
            }
            
            if ($totalContacts === 0) {
                $analysis[] = 'No contacts exist for this lead';
            }
            
            if ($daysSinceContact !== '-' && $daysSinceContact > 30) {
                $analysis[] = 'Last contact over 30 days ago';
            } elseif ($daysSinceContact !== '-' && $daysSinceContact > 14) {
                $analysis[] = 'Last contact over 14 days ago';
            }
            
            if (empty($analysis)) {
                if ($stageChangedInPeriod) {
                    $analysis[] = 'Stage progressed in period - Good!';
                } else {
                    $analysis[] = 'Active engagement';
                }
            }

            $data->push([
                'Lead ID' => $lead->id,
                'Company' => $lead->company ? $lead->company->name : 'Unknown',
                'Current Stage' => $lead->stage,
                'Lead Agent' => $lead->agent ? $lead->agent->name : 'Unassigned',
                'Total Contacts' => $totalContacts,
                'Contacts Engaged' => $contactsActive,
                'Total Activities (Period)' => $activitiesCount,
                'Activities by Agent' => $agentBreakdown,
                'Call Attempted' => $callAttempted,
                'Call Connected' => $callConnected,
                'WhatsApp Attempted' => $whatsappAttempted,
                'WhatsApp Connected' => $whatsappConnected,
                'LinkedIn Attempted' => $linkedinAttempted,
                'LinkedIn Connected' => $linkedinConnected,
                'Email Attempted' => $emailAttempted,
                'Email Connected' => $emailConnected,
                'Teams Chat Attempted' => $teamsChatAttempted,
                'Teams Chat Connected' => $teamsChatConnected,
                'Other Attempted' => $otherAttempted,
                'Other Connected' => $otherConnected,
                'Connection Rate' => $connectionRate,
                'Last Contacted Date' => $lastContactedDate,
                'Days Since Last Contact' => $daysSinceContact,
                'Stage Changed in Period' => $stageChangedInPeriod ? 'Yes' : 'No',
                'Analysis' => implode('; ', $analysis),
            ]);
        }

        return $data;
    }

    public function headings(): array
    {
        return [
            'Lead ID',
            'Company',
            'Current Stage',
            'Lead Agent',
            'Total Contacts',
            'Contacts Engaged',
            'Total Activities (Period)',
            'Activities by Agent',
            'Call Attempted',
            'Call Connected',
            'WhatsApp Attempted',
            'WhatsApp Connected',
            'LinkedIn Attempted',
            'LinkedIn Connected',
            'Email Attempted',
            'Email Connected',
            'Teams Chat Attempted',
            'Teams Chat Connected',
            'Other Attempted',
            'Other Connected',
            'Connection Rate',
            'Last Contacted Date',
            'Days Since Last Contact',
            'Stage Changed in Period',
            'Analysis',
        ];
    }

    public function title(): string
    {
        return 'Lead-Contact-Activity Report';
    }

    public function styles(Worksheet $sheet)
    {
        // Add campaign info at the top (insert rows before data)
        $sheet->insertNewRowBefore(1, 4);
        
        // Add campaign info
        $sheet->setCellValue('A1', 'Campaign:');
        $sheet->setCellValue('B1', $this->campaignName);
        $sheet->setCellValue('A2', 'Date Range:');
        $sheet->setCellValue('B2', $this->startDate . ' to ' . $this->endDate);
        $sheet->setCellValue('A3', 'Generated:');
        $sheet->setCellValue('B3', now()->format('Y-m-d H:i:s'));
        
        // Style the info section
        $sheet->getStyle('A1:A3')->applyFromArray([
            'font' => ['bold' => true],
        ]);
        
        // Style the header row (now on row 5 after inserting 4 rows)
        $sheet->getStyle('A5:Y5')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ]);

        // Set row height for header
        $sheet->getRowDimension(5)->setRowHeight(30);

        // Add filters to header row
        $sheet->setAutoFilter('A5:Y5');

        // Freeze the header row
        $sheet->freezePane('A6');

        // Color code analysis column (now column Y)
        $highestRow = $sheet->getHighestRow();
        for ($row = 6; $row <= $highestRow; $row++) {
            $analysisValue = $sheet->getCell('Y' . $row)->getValue();
            
            if (strpos($analysisValue, 'No follow-up') !== false || strpos($analysisValue, 'No contacts exist') !== false) {
                $sheet->getStyle('Y' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'FFE6E6'],
                    ],
                ]);
            } elseif (strpos($analysisValue, 'Stage progressed') !== false || strpos($analysisValue, 'Good!') !== false) {
                $sheet->getStyle('Y' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'E6FFE6'],
                    ],
                ]);
            } elseif (strpos($analysisValue, 'stage not progressed') !== false || strpos($analysisValue, 'over 30 days') !== false) {
                $sheet->getStyle('Y' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'FFF4E6'],
                    ],
                ]);
            }
            
            // Color code connection rate column (column U)
            $connectionRateValue = $sheet->getCell('U' . $row)->getValue();
            if ($connectionRateValue !== '-' && $connectionRateValue !== 'Connection Rate') {
                $rate = (float) str_replace('%', '', $connectionRateValue);
                if ($rate >= 50) {
                    $sheet->getStyle('U' . $row)->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'E6FFE6'], // Green
                        ],
                    ]);
                } elseif ($rate >= 25) {
                    $sheet->getStyle('U' . $row)->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'FFF4E6'], // Orange
                        ],
                    ]);
                } else {
                    $sheet->getStyle('U' . $row)->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'FFE6E6'], // Red
                        ],
                    ]);
                }
            }
        }

        return [];
    }
}

