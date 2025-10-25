<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AgentActivityAnalyticsExport implements WithMultipleSheets
{
    protected $analyticsData;
    protected $period;
    protected $campaignName;
    protected $dateRange;

    public function __construct($analyticsData, $period = 'daily', $campaignName = '', $dateRange = [])
    {
        $this->analyticsData = $analyticsData;
        $this->period = $period;
        $this->campaignName = $campaignName;
        $this->dateRange = $dateRange;
    }

    public function sheets(): array
    {
        $sheets = [];
        
        // Complete Overview Sheet with all metrics
        $sheets[] = new CompleteOverviewSheet($this->analyticsData, $this->period, $this->campaignName, $this->dateRange);
        
        // Connection Attempts & Success Rate Sheet
        $sheets[] = new ConnectionAttemptsSheet($this->analyticsData, $this->period);
        
        // Connection Methods Detailed Sheet
        $sheets[] = new ConnectionMethodsDetailedSheet($this->analyticsData, $this->period);
        
        // Stage Changes Detailed Sheet
        $sheets[] = new StageChangesDetailedSheet($this->analyticsData, $this->period);
        
        // Agent Performance Comparison Sheet
        $sheets[] = new AgentPerformanceComparisonSheet($this->analyticsData, $this->period);
        
        return $sheets;
    }
}

class CompleteOverviewSheet implements FromCollection, WithHeadings, WithTitle, WithStyles, WithColumnWidths
{
    protected $analyticsData;
    protected $period;
    protected $campaignName;
    protected $dateRange;

    public function __construct($analyticsData, $period, $campaignName = '', $dateRange = [])
    {
        $this->analyticsData = $analyticsData;
        $this->period = $period;
        $this->campaignName = $campaignName;
        $this->dateRange = $dateRange;
    }

    public function title(): string
    {
        return 'Complete Overview';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 20,
            'B' => 15,
            'C' => 15,
            'D' => 15,
            'E' => 18,
            'F' => 15,
            'G' => 12,
            'H' => 12,
            'I' => 12,
            'J' => 12,
            'K' => 12,
            'L' => 12,
            'M' => 12,
            'N' => 15,
            'O' => 15,
            'P' => 18,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 12]],
            2 => ['font' => ['bold' => true, 'size' => 11]],
            4 => ['font' => ['bold' => true], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2E8F0']]],
        ];
    }

    public function headings(): array
    {
        return [
            ['Campaign: ' . $this->campaignName],
            ['Period: ' . ucfirst($this->period) . ' Analytics'],
            [''],
            [
                'Agent Name',
                'Total Contacts',
                'Attempted',
                'Connected',
                'Connection Rate (%)',
                'Total Activities',
                'Call',
                'WhatsApp',
                'LinkedIn',
                'Email',
                'Teams Chat',
                'Other',
                'Total Leads',
                'Stage Changes',
                'No Stage Change',
                'Stage Change Rate (%)',
            ],
        ];
    }

    public function collection()
    {
        $data = collect();
        
        foreach ($this->analyticsData as $agentData) {
            $data->push([
                $agentData['agent_name'],
                $agentData['total_contacts'],
                $agentData['contacts_attempted'],
                $agentData['contacts_connected'],
                round($agentData['connection_rate'], 2),
                $agentData['total_activities'],
                $agentData['connection_methods']['Call'] ?? 0,
                $agentData['connection_methods']['WhatsApp'] ?? 0,
                $agentData['connection_methods']['LinkedIn'] ?? 0,
                $agentData['connection_methods']['Email'] ?? 0,
                $agentData['connection_methods']['Teams Chat'] ?? 0,
                $agentData['connection_methods']['Other'] ?? 0,
                $agentData['total_leads'],
                $agentData['stage_changes'],
                $agentData['no_stage_change'],
                round($agentData['stage_change_rate'], 2),
            ]);
        }
        
        // Add totals row
        $totalContacts = array_sum(array_column($this->analyticsData, 'total_contacts'));
        $totalAttempted = array_sum(array_column($this->analyticsData, 'contacts_attempted'));
        $totalConnected = array_sum(array_column($this->analyticsData, 'contacts_connected'));
        $totalActivities = array_sum(array_column($this->analyticsData, 'total_activities'));
        $totalCall = array_sum(array_map(fn($a) => $a['connection_methods']['Call'] ?? 0, $this->analyticsData));
        $totalWhatsApp = array_sum(array_map(fn($a) => $a['connection_methods']['WhatsApp'] ?? 0, $this->analyticsData));
        $totalLinkedIn = array_sum(array_map(fn($a) => $a['connection_methods']['LinkedIn'] ?? 0, $this->analyticsData));
        $totalEmail = array_sum(array_map(fn($a) => $a['connection_methods']['Email'] ?? 0, $this->analyticsData));
        $totalTeamsChat = array_sum(array_map(fn($a) => $a['connection_methods']['Teams Chat'] ?? 0, $this->analyticsData));
        $totalOther = array_sum(array_map(fn($a) => $a['connection_methods']['Other'] ?? 0, $this->analyticsData));
        $totalLeads = array_sum(array_column($this->analyticsData, 'total_leads'));
        $totalStageChanges = array_sum(array_column($this->analyticsData, 'stage_changes'));
        $totalNoStageChange = array_sum(array_column($this->analyticsData, 'no_stage_change'));
        
        $avgConnectionRate = $totalAttempted > 0 ? round(($totalConnected / $totalAttempted) * 100, 2) : 0;
        $avgStageChangeRate = ($totalStageChanges + $totalNoStageChange) > 0 
            ? round(($totalStageChanges / ($totalStageChanges + $totalNoStageChange)) * 100, 2) 
            : 0;
        
        $data->push([
            'TOTAL/AVERAGE',
            $totalContacts,
            $totalAttempted,
            $totalConnected,
            $avgConnectionRate,
            $totalActivities,
            $totalCall,
            $totalWhatsApp,
            $totalLinkedIn,
            $totalEmail,
            $totalTeamsChat,
            $totalOther,
            $totalLeads,
            $totalStageChanges,
            $totalNoStageChange,
            $avgStageChangeRate,
        ]);
        
        return $data;
    }
}

class ConnectionAttemptsSheet implements FromCollection, WithHeadings, WithTitle, WithStyles, WithColumnWidths
{
    protected $analyticsData;
    protected $period;

    public function __construct($analyticsData, $period)
    {
        $this->analyticsData = $analyticsData;
        $this->period = $period;
    }

    public function title(): string
    {
        return 'Connection Attempts';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 20,
            'B' => 18,
            'C' => 18,
            'D' => 18,
            'E' => 20,
            'F' => 18,
            'G' => 25,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2E8F0']]],
        ];
    }

    public function headings(): array
    {
        return [
            'Agent Name',
            'Total Contacts Available',
            'Contacts Attempted',
            'Contacts Connected',
            'Contacts Not Connected',
            'Connection Rate (%)',
            'Performance Rating',
        ];
    }

    public function collection()
    {
        $data = collect();
        
        foreach ($this->analyticsData as $agentData) {
            $notConnected = $agentData['contacts_attempted'] - $agentData['contacts_connected'];
            $connectionRate = round($agentData['connection_rate'], 2);
            
            $rating = 'Poor';
            if ($connectionRate >= 50) $rating = 'Excellent';
            elseif ($connectionRate >= 30) $rating = 'Good';
            elseif ($connectionRate >= 15) $rating = 'Fair';
            
            $data->push([
                $agentData['agent_name'],
                $agentData['total_contacts'],
                $agentData['contacts_attempted'],
                $agentData['contacts_connected'],
                $notConnected,
                $connectionRate,
                $rating,
            ]);
        }
        
        return $data;
    }
}

class ConnectionMethodsDetailedSheet implements FromCollection, WithHeadings, WithTitle, WithStyles, WithColumnWidths
{
    protected $analyticsData;
    protected $period;

    public function __construct($analyticsData, $period)
    {
        $this->analyticsData = $analyticsData;
        $this->period = $period;
    }

    public function title(): string
    {
        return 'Connection Methods Breakdown';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 20,
            'B' => 12,
            'C' => 14,
            'D' => 14,
            'E' => 12,
            'F' => 14,
            'G' => 12,
            'H' => 18,
            'I' => 20,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2E8F0']]],
        ];
    }

    public function headings(): array
    {
        return [
            'Agent Name',
            'Call',
            'WhatsApp',
            'LinkedIn',
            'Email',
            'Teams Chat',
            'Other',
            'Total Methods Used',
            'Most Used Method',
        ];
    }

    public function collection()
    {
        $data = collect();
        
        foreach ($this->analyticsData as $agentData) {
            $methods = $agentData['connection_methods'];
            $total = array_sum($methods);
            
            // Find most used method
            $mostUsed = 'None';
            $maxCount = 0;
            foreach ($methods as $method => $count) {
                if ($count > $maxCount) {
                    $maxCount = $count;
                    $mostUsed = $method . ' (' . $count . ')';
                }
            }
            
            $data->push([
                $agentData['agent_name'],
                $methods['Call'] ?? 0,
                $methods['WhatsApp'] ?? 0,
                $methods['LinkedIn'] ?? 0,
                $methods['Email'] ?? 0,
                $methods['Teams Chat'] ?? 0,
                $methods['Other'] ?? 0,
                $total,
                $mostUsed,
            ]);
        }
        
        // Add totals
        $totalCall = array_sum(array_map(fn($a) => $a['connection_methods']['Call'] ?? 0, $this->analyticsData));
        $totalWhatsApp = array_sum(array_map(fn($a) => $a['connection_methods']['WhatsApp'] ?? 0, $this->analyticsData));
        $totalLinkedIn = array_sum(array_map(fn($a) => $a['connection_methods']['LinkedIn'] ?? 0, $this->analyticsData));
        $totalEmail = array_sum(array_map(fn($a) => $a['connection_methods']['Email'] ?? 0, $this->analyticsData));
        $totalTeamsChat = array_sum(array_map(fn($a) => $a['connection_methods']['Teams Chat'] ?? 0, $this->analyticsData));
        $totalOther = array_sum(array_map(fn($a) => $a['connection_methods']['Other'] ?? 0, $this->analyticsData));
        $grandTotal = $totalCall + $totalWhatsApp + $totalLinkedIn + $totalEmail + $totalTeamsChat + $totalOther;
        
        $data->push([
            'TOTAL',
            $totalCall,
            $totalWhatsApp,
            $totalLinkedIn,
            $totalEmail,
            $totalTeamsChat,
            $totalOther,
            $grandTotal,
            '',
        ]);
        
        return $data;
    }
}

class StageChangesDetailedSheet implements FromCollection, WithHeadings, WithTitle, WithStyles, WithColumnWidths
{
    protected $analyticsData;
    protected $period;

    public function __construct($analyticsData, $period)
    {
        $this->analyticsData = $analyticsData;
        $this->period = $period;
    }

    public function title(): string
    {
        return 'Stage Changes Analysis';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 20,
            'B' => 15,
            'C' => 22,
            'D' => 18,
            'E' => 22,
            'F' => 20,
            'G' => 25,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2E8F0']]],
        ];
    }

    public function headings(): array
    {
        return [
            'Agent Name',
            'Total Leads',
            'Leads with Activities',
            'Stage Changes',
            'No Stage Change',
            'Stage Change Rate (%)',
            'Performance Rating',
        ];
    }

    public function collection()
    {
        $data = collect();
        
        foreach ($this->analyticsData as $agentData) {
            $stageChangeRate = round($agentData['stage_change_rate'], 2);
            
            $rating = 'Needs Improvement';
            if ($stageChangeRate >= 50) $rating = 'Excellent';
            elseif ($stageChangeRate >= 30) $rating = 'Good';
            elseif ($stageChangeRate >= 15) $rating = 'Fair';
            
            $data->push([
                $agentData['agent_name'],
                $agentData['total_leads'],
                $agentData['leads_with_activities'],
                $agentData['stage_changes'],
                $agentData['no_stage_change'],
                $stageChangeRate,
                $rating,
            ]);
        }
        
        // Add totals
        $totalLeads = array_sum(array_column($this->analyticsData, 'total_leads'));
        $totalActivities = array_sum(array_column($this->analyticsData, 'leads_with_activities'));
        $totalStageChanges = array_sum(array_column($this->analyticsData, 'stage_changes'));
        $totalNoStageChange = array_sum(array_column($this->analyticsData, 'no_stage_change'));
        $avgRate = ($totalStageChanges + $totalNoStageChange) > 0 
            ? round(($totalStageChanges / ($totalStageChanges + $totalNoStageChange)) * 100, 2) 
            : 0;
        
        $data->push([
            'TOTAL/AVERAGE',
            $totalLeads,
            $totalActivities,
            $totalStageChanges,
            $totalNoStageChange,
            $avgRate,
            '',
        ]);
        
        return $data;
    }
}

class AgentPerformanceComparisonSheet implements FromCollection, WithHeadings, WithTitle, WithStyles, WithColumnWidths
{
    protected $analyticsData;
    protected $period;

    public function __construct($analyticsData, $period)
    {
        $this->analyticsData = $analyticsData;
        $this->period = $period;
    }

    public function title(): string
    {
        return 'Performance Comparison';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 20,
            'B' => 18,
            'C' => 20,
            'D' => 20,
            'E' => 18,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2E8F0']]],
        ];
    }

    public function headings(): array
    {
        return [
            'Agent Name',
            'Productivity Score',
            'Connection Efficiency',
            'Stage Progression',
            'Overall Rating',
        ];
    }

    public function collection()
    {
        $data = collect();
        
        foreach ($this->analyticsData as $agentData) {
            // Calculate productivity score (activities per lead)
            $productivityScore = $agentData['total_leads'] > 0 
                ? round($agentData['total_activities'] / $agentData['total_leads'], 2)
                : 0;
            
            // Connection efficiency
            $connectionEfficiency = round($agentData['connection_rate'], 2) . '%';
            
            // Stage progression
            $stageProgression = round($agentData['stage_change_rate'], 2) . '%';
            
            // Overall rating based on multiple factors
            $avgScore = ($agentData['connection_rate'] + $agentData['stage_change_rate']) / 2;
            $overallRating = 'Poor';
            if ($avgScore >= 50) $overallRating = 'Excellent';
            elseif ($avgScore >= 35) $overallRating = 'Good';
            elseif ($avgScore >= 20) $overallRating = 'Fair';
            
            $data->push([
                $agentData['agent_name'],
                $productivityScore,
                $connectionEfficiency,
                $stageProgression,
                $overallRating,
            ]);
        }
        
        return $data;
    }
}

