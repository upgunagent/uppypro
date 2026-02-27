"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { tr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalIcon, Users } from "lucide-react";
import { DaySummaryDialog } from "./day-summary-dialog";
import { EventDialog } from "./event-dialog";
import { clsx } from "clsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Setup Localizer
const locales = {
    'tr': tr,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    color?: string;
    allDay?: boolean;
    resource?: any; // Full DB object
}

interface CalendarViewProps {
    tenantId: string;
    userId: string;
    profile?: any; // Business Profile
    initialEmployees: any[];
}

export function CalendarView({ tenantId, userId, profile, initialEmployees }: CalendarViewProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState(new Date());
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

    const [isDaySummaryOpen, setIsDaySummaryOpen] = useState(false);
    const [summaryDate, setSummaryDate] = useState<Date | null>(null);

    // Fetch Events
    const fetchEvents = useCallback(async () => {
        const supabase = createClient();

        // Calculate range based on view/date (Simply fetch all for now or current month +/- 1)
        // For simplicity, let's fetch a wide range or all. 
        // Ideally filter by start_time >= currentViewStart etc.

        const { data, error } = await supabase
            .from("calendar_events")
            .select("*, customers(full_name, company_name), tenant_employees(id, name, title)")
            .eq("tenant_id", tenantId)
            .order('start_time', { ascending: true });

        if (error) {
            console.error("Error fetching events:", error);
            return;
        }

        const mapped: CalendarEvent[] = data.map(item => {
            const startDate = new Date(item.start_time);
            let endDate = new Date(item.end_time);

            // FIX: If event ends exactly at midnight (00:00:00), react-big-calendar treats it as spanning to the next day
            // and prioritizes it (puts it at top). We subtract 1ms to keep it on the same day for sorting purposes.
            if (endDate.getHours() === 0 && endDate.getMinutes() === 0 && endDate.getSeconds() === 0 && endDate.getMilliseconds() === 0) {
                if (endDate.getTime() > startDate.getTime()) {
                    endDate = new Date(endDate.getTime() - 1);
                }
            }

            return {
                id: item.id,
                title: item.title,
                start: startDate,
                end: endDate,
                description: item.description,
                color: item.color,
                allDay: false, // Force timed event rendering
                resource: item
            };
        });

        // Client-side sort to be double sure
        mapped.sort((a, b) => {
            const timeDiff = a.start.getTime() - b.start.getTime();
            if (timeDiff !== 0) return timeDiff;
            // If same start time, sort by creation (ID roughly) or title
            return (a.title || "").localeCompare(b.title || "");
        });

        setEvents(mapped);
    }, [tenantId]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // 1. Past Day Check
        if (slotInfo.start < startOfToday) {
            // Open Day Summary for Past Days
            setSummaryDate(slotInfo.start);
            setIsDaySummaryOpen(true);
            return;
        }

        // 2. Time Check: If view is NOT month (i.e. Week or Day), and specific time is past
        if (view !== Views.MONTH && slotInfo.start < now) {
            return;
        }

        // 3. Month View Today Check: If view IS month, we allow clicking "Today" (which starts 00:00)
        // logic passed by step 1.

        setSelectedSlot(slotInfo);
        setSelectedEvent(null);
        setIsDialogOpen(true);
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setSelectedSlot(null);
        setIsDialogOpen(true);
    };

    // Style past dates/slots
    const dayPropGetter = (date: Date) => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (date < startOfToday) {
            return {
                className: "rbc-past-day",
                style: {
                    backgroundColor: "#f8fafc", // lighter slate
                    cursor: "pointer", // Make it clickable
                    // pointerEvents: "none" // REMOVED to allow clicking
                }
            };
        }
        return {};
    };

    const slotPropGetter = (date: Date) => {
        if (date < new Date()) {
            return {
                className: "rbc-past-time",
                style: {
                    backgroundColor: "#f8fafc", // slate-50
                    pointerEvents: "none" as const, // This might block click on existing events if they are in past, but usually events are on top.
                    opacity: 0.5
                }
            };
        }
        return {};
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedEvent(null);
        setSelectedSlot(null);
    };

    const handleSave = () => {
        handleCloseDialog();
        fetchEvents();
    };

    // Custom Toolbar
    const CustomToolbar = (toolbar: any) => {
        const goToBack = () => {
            toolbar.onNavigate('PREV');
        };
        const goToNext = () => {
            toolbar.onNavigate('NEXT');
        };
        const goToCurrent = () => {
            toolbar.onNavigate('TODAY');
        };

        const label = () => {
            const date = toolbar.date;
            return (
                <span className="capitalize font-semibold text-lg">
                    {format(date, view === 'day' ? 'd MMMM yyyy' : 'MMMM yyyy', { locale: tr })}
                </span>
            );
        };

        return (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 border-b pb-4 gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToBack}><ChevronLeft className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={goToCurrent}>Bugün</Button>
                    <Button variant="outline" size="sm" onClick={goToNext}><ChevronRight className="w-4 h-4" /></Button>
                    <div className="ml-4">{label()}</div>
                </div>

                <div className="flex items-center gap-4 flex-wrap w-full sm:w-auto">
                    {/* Employee Filter */}
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <Users className="w-4 h-4 text-slate-400" />
                        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Personel Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tüm Personeller</SelectItem>
                                {initialEmployees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        {emp.name} {emp.title ? `(${emp.title})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => toolbar.onView('month')}
                            className={clsx("px-3 py-1.5 text-sm rounded-md transition-all font-medium", view === 'month' ? "bg-amber-500 shadow text-white" : "text-slate-500 hover:text-slate-900")}
                        >
                            Ay
                        </button>
                        <button
                            onClick={() => toolbar.onView('week')}
                            className={clsx("px-3 py-1.5 text-sm rounded-md transition-all font-medium", view === 'week' ? "bg-blue-500 shadow text-white" : "text-slate-500 hover:text-slate-900")}
                        >
                            Hafta
                        </button>
                        <button
                            onClick={() => toolbar.onView('day')}
                            className={clsx("px-3 py-1.5 text-sm rounded-md transition-all font-medium", view === 'day' ? "bg-emerald-500 shadow text-white" : "text-slate-500 hover:text-slate-900")}
                        >
                            Gün
                        </button>
                    </div>

                    <Button
                        onClick={() => { setSelectedEvent(null); setSelectedSlot(null); setIsDialogOpen(true); }}
                        className="bg-orange-600 hover:bg-orange-700 w-10 h-10 p-0 rounded-lg flex items-center justify-center shadow-md transition-transform hover:scale-105"
                    >
                        <Plus className="w-6 h-6 text-white" strokeWidth={3} />
                    </Button>
                </div>
            </div>
        );
    };

    // Filter events based on selected employee
    const displayedEvents = selectedEmployeeId === "all"
        ? events
        : events.filter(e => e.resource.employee_id === selectedEmployeeId);

    return (
        <div className="h-full">
            <style>{`
                .rbc-calendar { font-family: inherit; }
                .rbc-header { padding: 12px 0; font-weight: 600; font-size: 0.875rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
                .rbc-month-view { border: none; }
                .rbc-day-bg { border-left: 1px solid #e2e8f0; }
                .rbc-off-range-bg { background: #f8fafc; }
                .rbc-updated { background: transparent !important; }
                .rbc-event { background-color: #3b82f6; border: none; border-radius: 6px; padding: 4px 8px; font-size: 0.85rem; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2); }
                .rbc-event:focus { outline: none; }
                .rbc-today { background-color: #eff6ff; }
                .rbc-current-time-indicator { background-color: #ef4444; }
                .rbc-time-view .rbc-row { min-height: 20px; }
            `}</style>

            <Calendar
                localizer={localizer}
                events={displayedEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                dayPropGetter={dayPropGetter}
                slotPropGetter={slotPropGetter}
                tooltipAccessor={(event) => {
                    const empName = event.resource?.tenant_employees?.name;
                    const empText = empName ? `\n👤 Personel: ${empName}` : '';
                    return `${event.title}\n${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}${empText}`;
                }}
                eventPropGetter={(event) => {
                    const colorMap: any = {
                        blue: '#3b82f6',
                        green: '#10b981',
                        yellow: '#f59e0b',
                        red: '#f43f5e'
                    };
                    const color = event.color || 'blue';
                    return {
                        style: {
                            backgroundColor: colorMap[color],
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }
                    };
                }}
                components={{
                    toolbar: CustomToolbar
                }}
                messages={{
                    next: "İleri",
                    previous: "Geri",
                    today: "Bugün",
                    month: "Ay",
                    week: "Hafta",
                    day: "Gün",
                    noEventsInRange: "Bu aralıkta etkinlik yok."
                }}
                culture="tr"
            />

            <EventDialog
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
                onSave={handleSave}
                event={selectedEvent?.resource}
                initialSlot={selectedSlot}
                tenantId={tenantId}
                profile={profile}
                employees={initialEmployees}
                preselectedEmployeeId={selectedEmployeeId === "all" ? undefined : selectedEmployeeId}
            />

            <DaySummaryDialog
                isOpen={isDaySummaryOpen}
                onClose={() => setIsDaySummaryOpen(false)}
                date={summaryDate}
                events={displayedEvents} // Pass filtered events
                onSelectEvent={(event) => {
                    setIsDaySummaryOpen(false); // Close summary
                    handleSelectEvent(event);   // Open edit dialog
                }}
            />
        </div>
    );
}
