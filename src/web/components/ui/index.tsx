import * as React from 'react'
import { cn } from '@/lib/utils'

export const Button = ({ className, variant = 'primary', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50',
      variant === 'primary' && 'bg-[var(--primary)] text-[var(--primary-fg)]',
      variant === 'outline' && 'border border-[var(--border)]',
      variant === 'ghost' && 'hover:bg-[var(--card)]',
      className,
    )}
    {...p}
  />
)
export const Input = ({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn('w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm', className)} {...p} />
)
export const Select = ({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn('rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm', className)} {...p} />
)
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-lg border border-[var(--border)] bg-[var(--card)] p-5', className)} {...p} />
)
export const Badge = ({ tone = 'neutral', children }: { tone?: 'neutral' | 'warn' | 'ok'; children: React.ReactNode }) => (
  <span className={cn('rounded-full px-2 py-0.5 text-xs', tone === 'warn' && 'bg-amber-500/20 text-amber-600', tone === 'ok' && 'bg-emerald-500/20 text-emerald-600', tone === 'neutral' && 'bg-slate-500/20')}>{children}</span>
)
