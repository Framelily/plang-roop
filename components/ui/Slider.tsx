'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValue?: boolean;
  suffix?: string;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className = '', label, showValue = true, suffix = '%', id, value, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={id}
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                {value}{suffix}
              </span>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          id={id}
          value={value}
          className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-zinc-900 dark:bg-zinc-700 dark:accent-white ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export default Slider;
