import { useState, useEffect } from 'react';

export interface Timezone {
    id: string;
    name: string;
    flag: string;
    timezone: string;
}

export const timezones: Timezone[] = [
    { id: 'system', name: 'SYS', flag: '💻', timezone: '' },
    { id: 'uae', name: 'UAE', flag: '🇦🇪', timezone: 'Asia/Dubai' },
    { id: 'india', name: 'IND', flag: '🇮🇳', timezone: 'Asia/Kolkata' },
    { id: 'nigeria', name: 'NGR', flag: '🇳🇬', timezone: 'Africa/Lagos' },
    { id: 'malaysia', name: 'MYS', flag: '🇲🇾', timezone: 'Asia/Kuala_Lumpur' },
    { id: 'saudi', name: 'KSA', flag: '🇸🇦', timezone: 'Asia/Riyadh' },
];

/**
 * Custom hook for managing user's selected timezone
 * Syncs with localStorage and updates across browser tabs/windows
 */
export function useTimezone() {
    const [selectedTimezone, setSelectedTimezone] = useState<Timezone>(() => {
        const saved = localStorage.getItem('selectedTimezone');
        if (saved) {
            const found = timezones.find(tz => tz.id === saved);
            if (found) return found;
        }
        return timezones[0];
    });

    // Listen for timezone changes from localStorage (cross-tab sync)
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('selectedTimezone');
            if (saved) {
                const found = timezones.find(tz => tz.id === saved);
                if (found && found.id !== selectedTimezone.id) {
                    setSelectedTimezone(found);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        // Also check periodically for changes in the same tab
        const interval = setInterval(handleStorageChange, 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [selectedTimezone.id]);

    /**
     * Get the timezone string to send to backend
     * For system timezone, uses browser's actual timezone
     * For selected timezone, uses the IANA timezone string
     */
    const getTimezoneForBackend = (): string => {
        if (selectedTimezone.id === 'system') {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        return selectedTimezone.timezone;
    };

    /**
     * Format a UTC datetime string in the user's selected timezone
     */
    const formatInTimezone = (
        utcDatetime: string,
        options?: Intl.DateTimeFormatOptions
    ): string => {
        const date = new Date(utcDatetime);
        
        const defaultOptions: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            ...options,
        };

        if (selectedTimezone.id === 'system') {
            // Use browser's local timezone
            return date.toLocaleString('en-US', defaultOptions);
        } else {
            // Use selected timezone
            return date.toLocaleString('en-US', {
                ...defaultOptions,
                timeZone: selectedTimezone.timezone,
            });
        }
    };

    /**
     * Get relative time string (e.g., "2h ago", "in 3d")
     */
    const getRelativeTime = (utcDatetime: string): string => {
        const date = new Date(utcDatetime);
        const now = new Date();
        
        let nowInTimezone: number;
        if (selectedTimezone.id === 'system') {
            nowInTimezone = now.getTime();
        } else {
            const nowStr = now.toLocaleString('en-US', { timeZone: selectedTimezone.timezone });
            nowInTimezone = new Date(nowStr).getTime();
        }
        
        const diffMs = date.getTime() - nowInTimezone;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMs < 0) {
            const absDays = Math.abs(diffDays);
            const absHours = Math.abs(diffHours);
            const absMins = Math.abs(diffMins);
            
            if (absDays > 0) return `${absDays}d ago`;
            if (absHours > 0) return `${absHours}h ago`;
            return `${absMins}m ago`;
        }

        if (diffDays > 0) return `in ${diffDays}d`;
        if (diffHours > 0) return `in ${diffHours}h`;
        return `in ${diffMins}m`;
    };

    return {
        selectedTimezone,
        timezones,
        getTimezoneForBackend,
        formatInTimezone,
        getRelativeTime,
    };
}

