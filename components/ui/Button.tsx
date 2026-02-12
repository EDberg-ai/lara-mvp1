import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700 focus:ring-brand-500 shadow-sm hover:shadow",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-200 shadow-sm",
    outline: "bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-300",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 focus:ring-red-500",
    gold: "bg-gradient-to-r from-gold-400 to-gold-500 text-navy-800 hover:from-gold-500 hover:to-gold-600 focus:ring-gold-400 shadow-sm hover:shadow font-semibold",
    navy: "bg-navy-800 text-white hover:bg-navy-900 focus:ring-navy-600 shadow-sm hover:shadow"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : leftIcon ? (
        <span className="mr-2">{leftIcon}</span>
      ) : null}
      {children}
    </button>
  );
};