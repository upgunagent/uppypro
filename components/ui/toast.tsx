"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>
}

// Fixed Top-Right position
const ToastViewport = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "fixed top-4 right-4 z-[99999] flex max-h-screen w-full flex-col p-4 md:max-w-[420px] gap-2 pointer-events-none", // pointer-events-none for viewport
            className
        )}
        {...props}
    />
))
ToastViewport.displayName = "ToastViewport"

const toastVariants = cva(
    "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-6 shadow-2xl transition-all shadow-black/20",
    {
        variants: {
            variant: {
                default: "bg-white text-slate-900 border-slate-200 border-l-4 border-l-green-600",
                destructive: "bg-white text-red-900 border-red-200 border-l-4 border-l-red-600",
                success: "bg-white text-green-900 border-green-200 border-l-4 border-l-green-600",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

type ToastContextType = {
    onClose?: () => void
}
const ToastContext = React.createContext<ToastContextType>({})

const Toast = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof toastVariants> & { onClose?: () => void }
>(({ className, variant, onClose, ...props }, ref) => {
    // Strip non-standard props
    const { onOpenChange, ...domProps } = props as any;

    return (
        <ToastContext.Provider value={{ onClose }}>
            <div
                ref={ref}
                className={cn(toastVariants({ variant }), className)}
                {...domProps}
            />
        </ToastContext.Provider>
    )
})
Toast.displayName = "Toast"

const ToastClose = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
    const { onClose } = React.useContext(ToastContext);
    return (
        <button
            ref={ref}
            className={cn(
                "absolute right-2 top-2 rounded-md p-1 text-slate-400 opacity-70 transition-opacity hover:text-slate-900 hover:opacity-100 focus:opacity-100 focus:outline-none group-hover:opacity-100",
                className
            )}
            onClick={(e) => {
                onClose?.();
                props.onClick?.(e);
            }}
            type="button"
            {...props}
        >
            <X className="h-4 w-4" />
        </button>
    )
})
ToastClose.displayName = "ToastClose"

const ToastTitle = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-sm font-bold mb-1", className)}
        {...props}
    />
))
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-sm opacity-90", className)}
        {...props}
    />
))
ToastDescription.displayName = "ToastDescription"

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

export {
    type ToastProps,
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
}
