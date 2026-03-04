import React from "react";
import { motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Button({ 
  className, 
  variant = "primary", 
  size = "md", 
  children, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-md dark:bg-primary-700 dark:hover:bg-primary-600",
    secondary: "bg-amber-600 text-white hover:bg-amber-700 shadow-md",
    outline: "border-2 border-primary-600/50 text-primary-600 hover:bg-primary-50/50 backdrop-blur-sm dark:border-primary-500 dark:text-primary-400 dark:hover:bg-primary-900/50",
    ghost: "text-primary-600 hover:bg-primary-50/50 backdrop-blur-sm dark:text-primary-400 dark:hover:bg-primary-900/50",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-md",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-2.5",
    lg: "px-8 py-3.5 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props as any}
    >
      {children}
    </motion.button>
  );
}

export function Card({ className, children, ...props }: { className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white rounded-2xl shadow-sm border border-primary-100 p-6 dark:bg-primary-900 dark:border-primary-800", className)}
      {...props as any}
    >
      {children}
    </motion.div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-4 py-2.5 rounded-xl border border-primary-100 bg-white/50 backdrop-blur-md focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all dark:bg-primary-950/50 dark:border-primary-800 dark:text-primary-50 dark:focus:border-primary-600",
        className
      )}
      {...props}
    />
  );
}
