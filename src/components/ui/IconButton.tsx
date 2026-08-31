import React from "react";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function IconButton({ children, className = "", ...rest }: IconButtonProps) {
  return (
    <button
      className={`w-8 h-8 rounded-full border border-app-border flex items-center justify-center hover:bg-app-bg transition-colors ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
