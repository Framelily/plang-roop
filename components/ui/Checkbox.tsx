'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, id, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center gap-2"
      >
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className={`h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
          {...props}
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
