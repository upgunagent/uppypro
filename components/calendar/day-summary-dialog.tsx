"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarEvent } from "./calendar-view";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface DaySummaryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    events: CalendarEvent[];
    onSelectEvent: (event: CalendarEvent) => void;
}

export function DaySummaryDialog({ isOpen, onClose, date, events, onSelectEvent }: DaySummaryDialogProps) {
    if (!date) return null;

    // Filter events for this specific day
    const dayEvents = events.filter(e =>
        e.start >= new Date(date.setHours(0, 0, 0, 0)) &&
        e.start < new Date(date.setHours(23, 59, 59, 999))
    ).sort((a, b) => a.start.getTime() - b.start.getTime());

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="capitalize">
                        {format(date, "d MMMM yyyy, EEEE", { locale: tr })}
                    </DialogTitle>
                    <p className="text-sm text-slate-500">Bu tarihteki kayıtlı randevular</p>
                </DialogHeader>

                <div className="space-y-2 py-4">
                    {dayEvents.length === 0 ? (
                        <div className="text-center text-slate-500 py-8 text-sm">
                            Bu tarihte kayıtlı randevu bulunmamaktadır.
                        </div>
                    ) : (
                        dayEvents.map(event => (
                            <div
                                key={event.id}
                                onClick={() => onSelectEvent(event)}
                                className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 cursor-pointer transition-all"
                            >
                                <div className="mt-0.5 min-w-[60px] flex flex-col items-center justify-center bg-white border border-slate-200 rounded px-1.5 py-1">
                                    <span className="text-xs font-bold text-slate-700">{format(event.start, "HH:mm")}</span>
                                    {/* <span className="text-[10px] text-slate-400">{format(event.end, "HH:mm")}</span> */}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-slate-900 truncate">
                                        {event.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 truncate">
                                        {event.resource?.customers?.full_name || event.resource?.guest_name || "İsimsiz"}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
