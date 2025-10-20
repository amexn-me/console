import { useState, useEffect } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Monitor, Clock } from 'lucide-react';

interface Timezone {
    id: string;
    name: string;
    flag: string;
    timezone: string;
}

const timezones: Timezone[] = [
    { id: 'system', name: 'SYS', flag: '💻', timezone: '' },
    { id: 'uae', name: 'UAE', flag: '🇦🇪', timezone: 'Asia/Dubai' },
    { id: 'india', name: 'IND', flag: '🇮🇳', timezone: 'Asia/Kolkata' },
    { id: 'nigeria', name: 'NGR', flag: '🇳🇬', timezone: 'Africa/Lagos' },
    { id: 'malaysia', name: 'MYS', flag: '🇲🇾', timezone: 'Asia/Kuala_Lumpur' },
    { id: 'saudi', name: 'KSA', flag: '🇸🇦', timezone: 'Asia/Riyadh' },
];

export function TimezoneClock() {
    const [selectedTimezone, setSelectedTimezone] = useState<Timezone>(() => {
        const saved = localStorage.getItem('selectedTimezone');
        if (saved) {
            const found = timezones.find(tz => tz.id === saved);
            if (found) return found;
        }
        return timezones[0];
    });

    const [currentTime, setCurrentTime] = useState('');
    const [allTimes, setAllTimes] = useState<Record<string, string>>({});

    const getTimeForTimezone = (timezone: Timezone): string => {
        const now = new Date();
        if (timezone.id === 'system') {
            return now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } else {
            return now.toLocaleTimeString('en-US', {
                timeZone: timezone.timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        }
    };

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            let timeString: string;

            if (selectedTimezone.id === 'system') {
                timeString = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
            } else {
                timeString = now.toLocaleTimeString('en-US', {
                    timeZone: selectedTimezone.timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
            }

            setCurrentTime(timeString);

            // Update all timezone times for dropdown
            const times: Record<string, string> = {};
            timezones.forEach(tz => {
                times[tz.id] = getTimeForTimezone(tz);
            });
            setAllTimes(times);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, [selectedTimezone]);

    const handleTimezoneChange = (timezone: Timezone) => {
        setSelectedTimezone(timezone);
        localStorage.setItem('selectedTimezone', timezone.id);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 font-mono text-sm border-border hover:bg-accent"
                >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{currentTime}</span>
                    <span className="text-muted-foreground">|</span>
                    {selectedTimezone.id === 'system' ? (
                        <Monitor className="h-4 w-4" />
                    ) : (
                        <span className="text-base">{selectedTimezone.flag}</span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
                {timezones.map((timezone) => (
                    <DropdownMenuItem
                        key={timezone.id}
                        onClick={() => handleTimezoneChange(timezone)}
                        className="flex items-center justify-between gap-3 cursor-pointer font-mono"
                    >
                        <div className="flex items-center gap-2">
                            {timezone.id === 'system' ? (
                                <Monitor className="h-4 w-4" />
                            ) : (
                                <span className="text-base">{timezone.flag}</span>
                            )}
                            <span className={selectedTimezone.id === timezone.id ? 'font-semibold' : ''}>
                                {timezone.name}
                            </span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                            {allTimes[timezone.id] || '--:-- --'}
                        </span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

