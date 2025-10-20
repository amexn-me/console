import { useState, useEffect, useMemo, useRef } from 'react'
import { Head, router } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Monitor, ChevronDown } from 'lucide-react'
import { route } from 'ziggy-js'
import type { BreadcrumbItem } from '@/types'
import { cn } from '@/lib/utils'

interface Timezone {
  id: string
  name: string
  flag: string
  timezone: string
}

const timezones: Timezone[] = [
  { id: 'system', name: 'SYS', flag: '💻', timezone: '' },
  { id: 'uae', name: 'UAE', flag: '🇦🇪', timezone: 'Asia/Dubai' },
  { id: 'india', name: 'IND', flag: '🇮🇳', timezone: 'Asia/Kolkata' },
  { id: 'nigeria', name: 'NGR', flag: '🇳🇬', timezone: 'Africa/Lagos' },
  { id: 'malaysia', name: 'MYS', flag: '🇲🇾', timezone: 'Asia/Kuala_Lumpur' },
  { id: 'saudi', name: 'KSA', flag: '🇸🇦', timezone: 'Asia/Riyadh' },
]

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
  },
  {
    title: 'Meetings',
    href: '/sales/meetings',
  },
]

interface CalendarAccount {
  id: number
  email: string
  name: string
  is_active: boolean
  is_staff_calendar: boolean
  user: {
    name: string
  }
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
  attendees?: Array<{ email: string }>
  meetLink?: string
  accountId: number
  accountName: string
  accountEmail: string
  backgroundColor: string
}

interface Props {
  calendarAccounts: CalendarAccount[]
  hasGoogleAuth: boolean
}

type ViewMode = 'day' | 'week' | 'month'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function Meetings({ calendarAccounts, hasGoogleAuth }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>(
    calendarAccounts.map((acc) => acc.id)
  )
  
  // Timezone from localStorage
  const [selectedTimezone, setSelectedTimezone] = useState<Timezone>(() => {
    const saved = localStorage.getItem('selectedTimezone')
    if (saved) {
      const found = timezones.find((tz) => tz.id === saved)
      if (found) return found
    }
    return timezones[0]
  })
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const monthViewRef = useRef<HTMLDivElement>(null)
  const currentDateRef = useRef<HTMLDivElement>(null)
  const currentDayRowRef = useRef<HTMLDivElement>(null)
  
  // Listen for timezone changes from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('selectedTimezone')
      if (saved) {
        const found = timezones.find((tz) => tz.id === saved)
        if (found) setSelectedTimezone(found)
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Also check periodically for same-tab updates
    const interval = setInterval(() => {
      const saved = localStorage.getItem('selectedTimezone')
      if (saved) {
        const found = timezones.find((tz) => tz.id === saved)
        if (found && found.id !== selectedTimezone.id) {
          setSelectedTimezone(found)
        }
      }
    }, 1000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [selectedTimezone.id])

  // Event dialog state
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [eventForm, setEventForm] = useState({
    accountId: calendarAccounts[0]?.id || 0,
    title: '',
    start: '',
    end: '',
    description: '',
    location: '',
    attendees: '',
  })

  // View details dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'day') {
      const start = new Date(currentDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(currentDate)
      end.setHours(23, 59, 59, 999)
      return { start, end, days: [new Date(currentDate)] }
    } else if (viewMode === 'week') {
      // Week view
      const start = new Date(currentDate)
      const day = start.getDay()
      start.setDate(start.getDate() - day) // Start of week (Sunday)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      
      const days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(start)
        date.setDate(date.getDate() + i)
        return date
      })
      
      return { start, end, days }
    } else {
      // Month view
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      
      // Get all days in the month
      const daysInMonth = end.getDate()
      const days = Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
        return date
      })
      
      return { start, end, days }
    }
  }, [currentDate, viewMode])

  // Get calendar grid for month view (includes padding days)
  const monthCalendarGrid = useMemo(() => {
    if (viewMode !== 'month') return []
    
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const startPadding = firstDay.getDay() // Days to pad at start
    const daysInMonth = lastDay.getDate()
    
    const grid: (Date | null)[] = []
    
    // Add padding days from previous month
    for (let i = 0; i < startPadding; i++) {
      const paddingDate = new Date(firstDay)
      paddingDate.setDate(paddingDate.getDate() - (startPadding - i))
      grid.push(paddingDate)
    }
    
    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
    }
    
    // Add padding days for next month to complete the grid
    const remainingCells = 7 - (grid.length % 7)
    if (remainingCells < 7) {
      for (let i = 1; i <= remainingCells; i++) {
        const paddingDate = new Date(lastDay)
        paddingDate.setDate(paddingDate.getDate() + i)
        grid.push(paddingDate)
      }
    }
    
    return grid
  }, [currentDate, viewMode])

  const fetchEvents = async () => {
    if (selectedAccounts.length === 0) {
      setEvents([])
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      })
      selectedAccounts.forEach((id) => {
        params.append('account_ids[]', id.toString())
      })

      const response = await fetch(`${route('calendar.events')}?${params.toString()}`)
      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Failed to fetch events:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [selectedAccounts, dateRange])

  // Auto-scroll to current time and date in day/week view
  useEffect(() => {
    if ((viewMode === 'day' || viewMode === 'week') && timelineRef.current) {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      
      // Scroll to 1 hour before current time for better context
      let scrollHour = hours - 1
      if (scrollHour < 0) scrollHour = 0
      
      const scrollLeftPosition = scrollHour * 120 // 120px per hour (w-30 = 7.5rem = 120px)
      
      // First scroll to current date vertically (week view)
      if (viewMode === 'week' && currentDayRowRef.current) {
        setTimeout(() => {
          currentDayRowRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }, 200)
      }
      
      // Then scroll to current time horizontally
      setTimeout(() => {
        timelineRef.current?.scrollTo({
          left: scrollLeftPosition,
          behavior: 'smooth'
        })
      }, viewMode === 'week' ? 400 : 200)
    }
  }, [viewMode, currentDate])
  
  // Ensure scroll on initial load and when events are loaded
  useEffect(() => {
    if ((viewMode === 'day' || viewMode === 'week') && events.length > 0 && currentDayRowRef.current) {
      // Additional scroll trigger after events are loaded for reliability
      setTimeout(() => {
        if (viewMode === 'week' && currentDayRowRef.current) {
          currentDayRowRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }
      }, 300)
    }
  }, [events.length, viewMode])

  // Auto-scroll to current date in month view
  useEffect(() => {
    if (viewMode === 'month' && currentDateRef.current) {
      setTimeout(() => {
        currentDateRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 100)
    }
  }, [viewMode, currentDate])

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start)
      return (
        eventStart.getDate() === date.getDate() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getFullYear() === date.getFullYear()
      )
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }

  const eventsOverlap = (event1: CalendarEvent, event2: CalendarEvent) => {
    const start1 = new Date(event1.start).getTime()
    const end1 = new Date(event1.end).getTime()
    const start2 = new Date(event2.start).getTime()
    const end2 = new Date(event2.end).getTime()
    
    return start1 < end2 && start2 < end1
  }

  const getOverlappingGroups = (events: CalendarEvent[]) => {
    if (events.length === 0) return []
    
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    )
    
    const groups: CalendarEvent[][] = []
    let currentGroup: CalendarEvent[] = [sortedEvents[0]]
    
    for (let i = 1; i < sortedEvents.length; i++) {
      const event = sortedEvents[i]
      const overlapsWithGroup = currentGroup.some(groupEvent => 
        eventsOverlap(event, groupEvent)
      )
      
      if (overlapsWithGroup) {
        currentGroup.push(event)
      } else {
        groups.push(currentGroup)
        currentGroup = [event]
      }
    }
    groups.push(currentGroup)
    
    return groups
  }

  const calculateEventLayout = (events: CalendarEvent[]) => {
    const layout = new Map<string, { column: number; totalColumns: number }>()
    const groups = getOverlappingGroups(events)
    
    groups.forEach(group => {
      if (group.length === 1) {
        layout.set(group[0].id, { column: 0, totalColumns: 1 })
      } else {
        // For overlapping events, assign columns
        const columns: CalendarEvent[][] = []
        
        group.forEach(event => {
          let placed = false
          
          // Try to place in existing column
          for (let i = 0; i < columns.length; i++) {
            const columnEvents = columns[i]
            const hasOverlap = columnEvents.some(e => eventsOverlap(event, e))
            
            if (!hasOverlap) {
              columns[i].push(event)
              layout.set(event.id, { column: i, totalColumns: 0 }) // Will update totalColumns later
              placed = true
              break
            }
          }
          
          // Create new column if needed
          if (!placed) {
            columns.push([event])
            layout.set(event.id, { column: columns.length - 1, totalColumns: 0 })
          }
        })
        
        // Update totalColumns for all events in this group
        const totalColumns = columns.length
        group.forEach(event => {
          const existing = layout.get(event.id)
          if (existing) {
            layout.set(event.id, { ...existing, totalColumns })
          }
        })
      }
    })
    
    return layout
  }

  const getEventPosition = (event: CalendarEvent, date: Date) => {
    const eventStart = new Date(event.start)
    const eventEnd = new Date(event.end)
    
    const startHour = eventStart.getHours()
    const startMinute = eventStart.getMinutes()
    const endHour = eventEnd.getHours()
    const endMinute = eventEnd.getMinutes()
    
    const top = (startHour * 60 + startMinute) / 60
    const height = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60
    
    return { top, height }
  }

  const formatTime = (hour: number) => {
    // Create a date object for the current date at the specified hour in selected timezone
    const date = new Date(currentDate)
    date.setHours(hour, 0, 0, 0)
    
    if (selectedTimezone.id === 'system') {
      if (hour === 0) return '12 AM'
      if (hour < 12) return `${hour} AM`
      if (hour === 12) return '12 PM'
      return `${hour - 12} PM`
    } else {
      // Format for selected timezone
      return date.toLocaleTimeString('en-US', {
        timeZone: selectedTimezone.timezone,
        hour: 'numeric',
        hour12: true,
      })
    }
  }
  
  const handleTimezoneChange = (timezone: Timezone) => {
    setSelectedTimezone(timezone)
    localStorage.setItem('selectedTimezone', timezone.id)
  }

  const formatEventTime = (date: string) => {
    const d = new Date(date)
    
    if (selectedTimezone.id === 'system') {
      const hours = d.getHours()
      const minutes = d.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
    } else {
      return d.toLocaleTimeString('en-US', {
        timeZone: selectedTimezone.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    }
  }

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setViewDialogOpen(true)
  }

  const handleTimeSlotClick = (date: Date, hour: number) => {
    const start = new Date(date)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(date)
    end.setHours(hour + 1, 0, 0, 0)

    setEventForm({
      accountId: calendarAccounts[0]?.id || 0,
      title: '',
      start: start.toISOString().slice(0, 16),
      end: end.toISOString().slice(0, 16),
      description: '',
      location: '',
      attendees: '',
    })
    setSelectedEvent(null)
    setEventDialogOpen(true)
  }

  const handleDateClick = (date: Date) => {
    const start = new Date(date)
    start.setHours(9, 0, 0, 0) // Default to 9 AM
    const end = new Date(date)
    end.setHours(10, 0, 0, 0) // Default to 10 AM

    setEventForm({
      accountId: calendarAccounts[0]?.id || 0,
      title: '',
      start: start.toISOString().slice(0, 16),
      end: end.toISOString().slice(0, 16),
      description: '',
      location: '',
      attendees: '',
    })
    setSelectedEvent(null)
    setEventDialogOpen(true)
  }

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const attendeeList = eventForm.attendees
      ? eventForm.attendees
          .split(',')
          .map((email) => ({ email: email.trim() }))
          .filter((a) => a.email)
      : []

    try {
      const response = await fetch(route('calendar.events.create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN':
            document
              .querySelector('meta[name="csrf-token"]')
              ?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          account_id: eventForm.accountId,
          title: eventForm.title,
          start: eventForm.start,
          end: eventForm.end,
          description: eventForm.description,
          location: eventForm.location,
          attendees: attendeeList,
        }),
      })

      if (response.ok) {
        setEventDialogOpen(false)
        fetchEvents()
      }
    } catch (error) {
      console.error('Failed to create event:', error)
    }
  }

  const handleEventUpdate = async () => {
    if (!selectedEvent) return

    try {
      const response = await fetch(
        route('calendar.events.update', { eventId: selectedEvent.id }),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN':
              document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '',
          },
          body: JSON.stringify({
            account_id: selectedEvent.accountId,
            title: eventForm.title,
            start: eventForm.start,
            end: eventForm.end,
            description: eventForm.description,
            location: eventForm.location,
          }),
        }
      )

      if (response.ok) {
        setEventDialogOpen(false)
        setViewDialogOpen(false)
        fetchEvents()
      }
    } catch (error) {
      console.error('Failed to update event:', error)
    }
  }

  const handleEventDelete = async () => {
    if (!selectedEvent) return

    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const response = await fetch(
        route('calendar.events.delete', { eventId: selectedEvent.id }),
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN':
              document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '',
          },
          body: JSON.stringify({
            account_id: selectedEvent.accountId,
          }),
        }
      )

      if (response.ok) {
        setViewDialogOpen(false)
        fetchEvents()
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const handleEditEvent = () => {
    if (selectedEvent) {
      setEventForm({
        accountId: selectedEvent.accountId,
        title: selectedEvent.title,
        start: selectedEvent.start.slice(0, 16),
        end: selectedEvent.end.slice(0, 16),
        description: selectedEvent.description || '',
        location: selectedEvent.location || '',
        attendees: selectedEvent.attendees
          ?.map((a) => a.email)
          .join(', ') || '',
      })
      setViewDialogOpen(false)
      setEventDialogOpen(true)
    }
  }

  const toggleAccountSelection = (accountId: number) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    )
  }

  const getAccountColor = (accountId: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-amber-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-orange-500',
    ]
    return colors[accountId % colors.length]
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const currentTimePosition = useMemo(() => {
    const now = new Date()
    let hours: number
    let minutes: number
    
    if (selectedTimezone.id === 'system') {
      hours = now.getHours()
      minutes = now.getMinutes()
    } else {
      // Get time in selected timezone
      const timeString = now.toLocaleTimeString('en-US', {
        timeZone: selectedTimezone.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      const [hoursStr, minutesStr] = timeString.split(':')
      hours = parseInt(hoursStr)
      minutes = parseInt(minutesStr)
    }
    
    return (hours * 60 + minutes) / 60
  }, [selectedTimezone])

  const getDateTitle = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } else if (viewMode === 'week') {
      return `${dateRange.days[0].toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${dateRange.days[6].toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
    } else {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Meetings" />

      <Card className="border-0 shadow-none">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b bg-card px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate('prev')}
                  className="h-9 w-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="h-9"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate('next')}
                  className="h-9 w-9"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Date Display */}
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">
                  {getDateTitle()}
                </h2>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
                <Button
                  variant={viewMode === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className="h-7"
                >
                  Day
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="h-7"
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="h-7"
                >
                  Month
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Staff Calendar Pills */}
              {calendarAccounts.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Team:
                  </span>
                  {calendarAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => toggleAccountSelection(account.id)}
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all hover:scale-105',
                        selectedAccounts.includes(account.id)
                          ? `${getAccountColor(account.id)} text-white opacity-100`
                          : 'bg-muted text-muted-foreground opacity-60'
                      )}
                    >
                      {account.name}
                    </button>
                  ))}
                </div>
              )}

              {/* New Event Button */}
              <Button onClick={() => setEventDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Button>
            </div>
          </div>

          {/* Gantt Chart View (Day/Week) */}
          {(viewMode === 'day' || viewMode === 'week') && (
            <div ref={timelineRef} className="relative overflow-auto max-h-[calc(100vh-250px)]">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
                  <div className="text-sm text-muted-foreground">Loading events...</div>
                </div>
              )}

              <div className="min-w-max">
                {/* Header Row - Time Markers (Hours) */}
                <div className="flex sticky top-0 z-30 bg-card border-b shadow-sm">
                  {/* Timezone Column Header */}
                  <div className="sticky left-0 z-40 w-36 flex-shrink-0 border-r bg-card shadow-sm">
                    <div className="h-16 flex items-center justify-center px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 text-sm border-border hover:bg-accent w-full justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {selectedTimezone.id === 'system' ? (
                                <>
                                  <Monitor className="h-4 w-4" />
                                  <span className="font-medium">SYS</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-base">{selectedTimezone.flag}</span>
                                  <span className="font-medium">{selectedTimezone.name}</span>
                                </>
                              )}
                            </div>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="min-w-[140px]">
                          {timezones.map((timezone) => (
                            <DropdownMenuItem
                              key={timezone.id}
                              onClick={() => handleTimezoneChange(timezone)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              {timezone.id === 'system' ? (
                                <Monitor className="h-4 w-4" />
                              ) : (
                                <span className="text-base">{timezone.flag}</span>
                              )}
                              <span className={selectedTimezone.id === timezone.id ? 'font-semibold' : ''}>
                                {timezone.name}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Hour Grid Headers */}
                  <div className="flex flex-1">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="w-30 flex-shrink-0 border-r last:border-r-0"
                      >
                        <div className="h-16 flex flex-col items-center justify-center">
                          <span className="text-sm font-semibold text-muted-foreground">
                            {formatTime(hour)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day/Staff Rows */}
                {dateRange.days.map((date, dayIndex) => {
                  const isCurrentDay = isToday(date)
                  const activeAccounts = calendarAccounts.filter(account => 
                    selectedAccounts.includes(account.id)
                  )
                  const staffCount = activeAccounts.length
                  
                  // Format date as "Sun, 10/10/24"
                  const dateString = `${date.toLocaleDateString('en-US', { weekday: 'short' })}, ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`
                  
                  return (
                    <div 
                      key={dayIndex} 
                      ref={isCurrentDay ? currentDayRowRef : null}
                      className="flex border-b-2 border-border/80"
                    >
                      {/* Merged Date Column - spans all staff for this day */}
                      {viewMode === 'week' && (
                        <div 
                          className={cn(
                            "sticky left-0 z-20 w-8 flex items-center justify-center border-r shadow-md",
                            isCurrentDay ? "bg-primary/95" : "bg-muted"
                          )}
                        >
                          <div 
                            className={cn(
                              "whitespace-nowrap text-xs font-medium tracking-wide",
                              isCurrentDay ? "text-primary-foreground font-bold" : "text-foreground font-semibold"
                            )}
                            style={{
                              transform: 'rotate(-90deg)',
                              transformOrigin: 'center center',
                            }}
                          >
                            {dateString}
                          </div>
                        </div>
                      )}
                      
                      {/* Staff rows column */}
                      <div className="flex-1">
                        {activeAccounts.map((account, accountIndex) => {
                          const accountEvents = events.filter(event => 
                            event.accountId === account.id &&
                            new Date(event.start).getDate() === date.getDate() &&
                            new Date(event.start).getMonth() === date.getMonth() &&
                            new Date(event.start).getFullYear() === date.getFullYear()
                          )
                          
                          const layout = calculateEventLayout(accountEvents)
                          
                          return (
                            <div
                              key={account.id}
                              className={cn(
                                "flex border-b border-border/30 last:border-b-0 hover:bg-accent/30 transition-colors",
                                isCurrentDay && "bg-primary/5"
                              )}
                            >
                              {/* Staff Label */}
                              <div className={cn(
                                "sticky z-20 w-28 flex-shrink-0 border-r bg-card shadow-sm",
                                viewMode === 'week' ? 'left-8' : 'left-0'
                              )}>
                                <div className="h-20 flex items-center px-2 py-2">
                                  <div className="flex items-center gap-2 w-full">
                                    <div
                                      className={cn(
                                        'h-3 w-3 rounded-full flex-shrink-0',
                                        getAccountColor(account.id)
                                      )}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-medium line-clamp-2">
                                        {account.name}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Timeline Grid (Gantt-style) */}
                              <div className="flex-1 relative h-20">
                              {/* Hour Columns (for clicking to add events) */}
                              <div className="absolute inset-0 flex">
                                {HOURS.map((hour) => (
                                  <div
                                    key={hour}
                                    className="w-30 flex-shrink-0 border-r last:border-r-0 hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => {
                                      const start = new Date(date)
                                      start.setHours(hour, 0, 0, 0)
                                      const end = new Date(date)
                                      end.setHours(hour + 1, 0, 0, 0)
                                      
                                      setEventForm({
                                        accountId: account.id,
                                        title: '',
                                        start: start.toISOString().slice(0, 16),
                                        end: end.toISOString().slice(0, 16),
                                        description: '',
                                        location: '',
                                        attendees: '',
                                      })
                                      setSelectedEvent(null)
                                      setEventDialogOpen(true)
                                    }}
                                  />
                                ))}
                              </div>

                              {/* Current Time Indicator */}
                              {isCurrentDay && (
                                <div
                                  className="absolute top-0 bottom-0 z-10 w-0.5 bg-red-500"
                                  style={{ left: `${(currentTimePosition / 24) * (24 * 120)}px` }}
                                >
                                  <div className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-red-500 bg-background" />
                                </div>
                              )}

                              {/* Events as horizontal bars */}
                              {accountEvents.map((event) => {
                                const eventStart = new Date(event.start)
                                const eventEnd = new Date(event.end)
                                
                                const startHour = eventStart.getHours()
                                const startMinute = eventStart.getMinutes()
                                const endHour = eventEnd.getHours()
                                const endMinute = eventEnd.getMinutes()
                                
                                // Calculate horizontal position and width
                                const startPercent = ((startHour * 60 + startMinute) / (24 * 60)) * 100
                                const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
                                const widthPercent = (duration / (24 * 60)) * 100
                                
                                const layoutInfo = layout.get(event.id) || { column: 0, totalColumns: 1 }
                                const { column, totalColumns } = layoutInfo
                                
                                // Stacked effect for overlapping events in same staff row
                                const hasOverlap = totalColumns > 1
                                const offsetPixels = hasOverlap ? column * 4 : 0
                                const heightReduction = hasOverlap ? (totalColumns - 1) * 4 : 0
                                const zIndex = 10 + column
                                
                                return (
                                  <div
                                    key={event.id}
                                    className="absolute cursor-pointer overflow-hidden rounded-md border-2 border-white/20 shadow-lg transition-all hover:shadow-xl hover:scale-105"
                                    style={{
                                      left: `${startPercent}%`,
                                      width: `${widthPercent}%`,
                                      top: `calc(0.25rem + ${offsetPixels}px)`,
                                      bottom: `calc(0.25rem + ${heightReduction - offsetPixels}px)`,
                                      zIndex: zIndex,
                                      backgroundColor: event.backgroundColor,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.zIndex = '100'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.zIndex = zIndex.toString()
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEventClick(event)
                                    }}
                                  >
                                    <div className="h-full overflow-hidden px-2 py-1 text-white">
                                      <div className="text-xs font-medium break-words line-clamp-2">
                                        {event.title}
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <Clock className="h-2.5 w-2.5 flex-shrink-0 opacity-90" />
                                        <span className="text-[10px] opacity-90">
                                          {formatEventTime(event.start)}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Overlap indicator */}
                                    {hasOverlap && column < totalColumns - 1 && (
                                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 border-t border-white/20" />
                                    )}
                                  </div>
                                )
                              })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Month View */}
          {viewMode === 'month' && (
            <div ref={monthViewRef} className="p-6 overflow-auto max-h-[calc(100vh-250px)]">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
                  <div className="text-sm text-muted-foreground">Loading events...</div>
                </div>
              )}

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-px mb-px">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="bg-muted/50 py-3 text-center text-sm font-semibold text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-border">
                {monthCalendarGrid.map((date, index) => {
                  if (!date) return null
                  const dayEvents = getEventsForDate(date)
                  const isCurrentDay = isToday(date)
                  const inCurrentMonth = isCurrentMonth(date)

                  return (
                    <div
                      key={index}
                      ref={isCurrentDay ? currentDateRef : null}
                      className={cn(
                        'min-h-[120px] bg-card p-2 transition-colors hover:bg-accent/50 cursor-pointer',
                        !inCurrentMonth && 'bg-muted/30 opacity-60'
                      )}
                      onClick={() => handleDateClick(date)}
                    >
                      <div
                        className={cn(
                          'mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                          isCurrentDay && 'bg-primary text-primary-foreground',
                          !isCurrentDay && inCurrentMonth && 'text-foreground',
                          !inCurrentMonth && 'text-muted-foreground'
                        )}
                      >
                        {date.getDate()}
                      </div>

                      {/* Events List */}
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className="rounded px-2 py-1 text-xs font-medium text-white transition-all hover:scale-105"
                            style={{ backgroundColor: event.backgroundColor }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEventClick(event)
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span className="line-clamp-1">
                                {formatEventTime(event.start)} {event.title}
                              </span>
                            </div>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs font-medium text-muted-foreground px-2">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? 'Edit Event' : 'Create New Event'}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent
                ? 'Update the event details below.'
                : 'Schedule a new meeting or event.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEventSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account">Staff Calendar</Label>
              <Select
                value={eventForm.accountId.toString()}
                onValueChange={(value) =>
                  setEventForm({ ...eventForm, accountId: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendarAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} ({account.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                required
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm({ ...eventForm, title: e.target.value })
                }
                placeholder="e.g., Demo Call with Client"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Start Date & Time</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  required
                  value={eventForm.start}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, start: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End Date & Time</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  required
                  value={eventForm.end}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, end: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={eventForm.location}
                onChange={(e) =>
                  setEventForm({ ...eventForm, location: e.target.value })
                }
                placeholder="e.g., Conference Room A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm({ ...eventForm, description: e.target.value })
                }
                placeholder="Add any additional details..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendees">
                Attendees (Optional, comma-separated emails)
              </Label>
              <Input
                id="attendees"
                value={eventForm.attendees}
                onChange={(e) =>
                  setEventForm({ ...eventForm, attendees: e.target.value })
                }
                placeholder="email1@example.com, email2@example.com"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEventDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={selectedEvent ? handleEventUpdate : handleEventSubmit}
              >
                {selectedEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Event Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Staff</Label>
                <p className="text-sm">
                  {selectedEvent.accountName} ({selectedEvent.accountEmail})
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Date & Time
                </Label>
                <p className="text-sm">
                  {new Date(selectedEvent.start).toLocaleString()} -{' '}
                  {new Date(selectedEvent.end).toLocaleString()}
                </p>
              </div>

              {selectedEvent.location && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Location
                  </Label>
                  <p className="text-sm">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Description
                  </Label>
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.meetLink && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Google Meet
                  </Label>
                  <a
                    href={selectedEvent.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Join Meeting
                  </a>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Attendees
                  </Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedEvent.attendees.map((attendee, idx) => (
                      <Badge key={idx} variant="secondary">
                        {attendee.email}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="destructive" onClick={handleEventDelete}>
                  Delete
                </Button>
                <Button variant="outline" onClick={handleEditEvent}>
                  Edit
                </Button>
                <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
