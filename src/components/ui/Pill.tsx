import React from "react";

interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Pill({ icon, children, className = "", ...rest }: PillProps) {
  return (
    <button
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-app-border text-xs font-medium text-app-text-soft hover:bg-app-bg transition-colors ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
