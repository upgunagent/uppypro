"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/* Simple custom Sheet implementation required due to missing Radix deps */

const SheetContext = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void } | null>(null)

export const Sheet = ({ children, open, onOpenChange }: { children: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) => {
    // Determine state (controlled vs uncontrolled logic skipped for simplicity, forcing controlled if provided)
    return (
        <SheetContext.Provider value={{ open: open || false, onOpenChange: onOpenChange || (() => { }) }}>
            {children}
        </SheetContext.Provider>
    )
}

export const SheetContent = ({ children, className, overlayClassName }: { children: React.ReactNode, className?: string, overlayClassName?: string }) => {
    const context = React.useContext(SheetContext)
    const [shouldRender, setShouldRender] = React.useState(false)
    const [animateOpen, setAnimateOpen] = React.useState(false)

    React.useEffect(() => {
        if (context?.open) {
            setShouldRender(true)
            // Double RAF to ensure browser paints the initial state (translate-x-full)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setAnimateOpen(true)
                })
            })
        } else {
            setAnimateOpen(false)
            const timer = setTimeout(() => {
                setShouldRender(false)
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [context?.open])

    if (!shouldRender) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex justify-end pointer-events-none">
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto",
                    animateOpen ? "opacity-100" : "opacity-0",
                    overlayClassName
                )}
                onClick={() => context?.onOpenChange(false)}
            />
            {/* Panel */}
            <div
                style={{ backgroundColor: 'white' }}
                className={cn(
                    "relative z-50 h-full w-full max-w-sm border-l bg-white p-6 shadow-2xl transition-transform duration-300 ease-in-out pointer-events-auto",
                    animateOpen ? "translate-x-0" : "translate-x-full",
                    className
                )}>
                <div className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 dark:ring-offset-slate-950 dark:focus:ring-slate-300 dark:data-[state=open]:bg-slate-800">
                    <X className="h-4 w-4 cursor-pointer" onClick={() => context?.onOpenChange(false)} />
                </div>
                {children}
            </div>
        </div>
    )
}

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
)

export const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={cn("text-lg font-semibold text-slate-900 dark:text-slate-50", className)} {...props} />
)

export const SheetDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm text-slate-500 dark:text-slate-400", className)} {...props} />
)
