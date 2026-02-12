import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  noPadding = false,
  onClick,
  ...rest
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''} ${className}`}
      {...rest}
    >
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-5 py-4 border-b border-slate-100 ${className}`}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="font-semibold text-slate-900">{children}</h3>
);