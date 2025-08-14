"use client";

import { ReactNode, ElementType } from "react";

interface HydrationSafeElementProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  [key: string]: unknown;
}

/**
 * A wrapper component that safely handles hydration mismatches
 * caused by browser extensions that modify the DOM
 */
export function HydrationSafeElement({
  children,
  as: Component = "div",
  className,
  ...props
}: HydrationSafeElementProps) {
  return (
    <Component suppressHydrationWarning className={className} {...props}>
      {children}
    </Component>
  );
}

/**
 * A wrapper for form inputs that commonly get modified by browser extensions
 */
export function HydrationSafeInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return <input suppressHydrationWarning {...props} />;
}

/**
 * A wrapper for buttons that commonly get modified by browser extensions
 */
export function HydrationSafeButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return <button suppressHydrationWarning {...props} />;
}
