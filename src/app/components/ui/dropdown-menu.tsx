// app/components/ui/dropdown-menu.tsx
"use client"

import * as React from "react"
import { cn } from "@/app/lib/utils"

interface DropdownMenuProps {
  children: React.ReactNode
  className?: string
}

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  align?: "start" | "end"
}

interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode
    asChild?: boolean
    onClick?: React.MouseEventHandler<HTMLElement>
}

const DropdownMenuContext = React.createContext<{
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}>({ open: false, setOpen: () => {} })

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({ children, asChild, className, ...props }: DropdownMenuTriggerProps) {
    const { open, setOpen } = React.useContext(DropdownMenuContext)
    
    if (asChild) {
      return React.cloneElement(children as React.ReactElement<{ onClick?: React.MouseEventHandler<HTMLElement> }>, {
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          setOpen(!open);
          props.onClick?.(e);
        }
      })
    }

  return (
    <button
      type="button"
      onClick={(e) => {
        setOpen(!open);
        props.onClick?.(e as React.MouseEvent<HTMLElement>);
      }}
      className={cn("inline-flex justify-center", className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function DropdownMenuContent({ 
  children, 
  className, 
  align = "end",
  ...props 
}: DropdownMenuContentProps) {
  const { open } = React.useContext(DropdownMenuContext)

  if (!open) return null

  return (
    <div
      className={cn(
        "absolute z-50 mt-2 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5",
        align === "end" ? "right-0" : "left-0",
        "animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      <div className="py-1">{children}</div>
    </div>
  )
}

export function DropdownMenuLabel({ className, children, ...props }: DropdownMenuLabelProps) {
  return (
    <div
      className={cn("px-3 py-2 text-sm font-medium text-gray-900", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({ className, children, ...props }: DropdownMenuItemProps) {
  return (
    <button
      className={cn(
        "w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <div
      className={cn("my-1 h-px bg-gray-200", className)}
      role="separator"
    />
  )
}