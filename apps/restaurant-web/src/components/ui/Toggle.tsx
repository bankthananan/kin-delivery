import React from 'react';

interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: 'sm' | 'lg';
}

export function Toggle({ label, checked, onCheckedChange, size = 'sm', className = '', ...props }: ToggleProps) {
  const isLg = size === 'lg';
  
  return (
    <label className={`flex items-center cursor-pointer ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          {...props}
        />
        <div className={`block rounded-full transition-colors pointer-events-none ${checked ? 'bg-success' : 'bg-surface-300'} ${isLg ? 'w-14 h-8' : 'w-10 h-6'}`}></div>
        <div className={`absolute left-1 bg-white rounded-full transition-transform pointer-events-none ${isLg ? 'w-6 h-6 top-1' : 'w-4 h-4 top-1'} ${checked ? (isLg ? 'translate-x-6' : 'translate-x-4') : ''}`}></div>
      </div>
      {label && <div className={`ml-3 font-medium text-surface-700 ${isLg ? 'text-lg' : 'text-sm'}`}>{label}</div>}
    </label>
  );
}
