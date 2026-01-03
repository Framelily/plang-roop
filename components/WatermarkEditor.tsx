'use client';

import { useState } from 'react';
import { Input, Slider, Button } from '@/components/ui';
import type { WatermarkOptions, WatermarkPosition } from '@/lib/watermark/apply';
import { DEFAULT_WATERMARK_OPTIONS } from '@/lib/watermark/apply';

interface WatermarkEditorProps {
  onApply: (options: WatermarkOptions) => void;
  disabled?: boolean;
}

const POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'center', label: 'Center' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

export default function WatermarkEditor({ onApply, disabled }: WatermarkEditorProps) {
  const [options, setOptions] = useState<WatermarkOptions>(DEFAULT_WATERMARK_OPTIONS);
  const [isExpanded, setIsExpanded] = useState(false);

  const updateOption = <K extends keyof WatermarkOptions>(
    key: K,
    value: WatermarkOptions[K]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="font-medium text-zinc-900 dark:text-white">
          Watermark
        </h3>
        <svg
          className={`h-5 w-5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-4 pt-2">
          <Input
            id="watermark-text"
            label="Text"
            value={options.text}
            onChange={(e) => updateOption('text', e.target.value)}
            placeholder="Enter watermark text"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="watermark-size"
              type="number"
              label="Font Size"
              suffix="px"
              value={options.fontSize}
              onChange={(e) => updateOption('fontSize', Number(e.target.value))}
              min={8}
              max={200}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Color
              </label>
              <input
                type="color"
                value={options.color}
                onChange={(e) => updateOption('color', e.target.value)}
                className="h-10 w-full cursor-pointer rounded-lg border border-zinc-300 dark:border-zinc-700"
              />
            </div>
          </div>

          <Slider
            id="watermark-opacity"
            label="Opacity"
            min={10}
            max={100}
            step={5}
            value={Math.round(options.opacity * 100)}
            onChange={(e) => updateOption('opacity', Number(e.target.value) / 100)}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Position
            </label>
            <select
              value={options.position}
              onChange={(e) => updateOption('position', e.target.value as WatermarkPosition)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              {POSITIONS.map((pos) => (
                <option key={pos.value} value={pos.value}>
                  {pos.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => onApply(options)}
            disabled={disabled || !options.text.trim()}
            className="w-full"
          >
            Apply Watermark
          </Button>
        </div>
      )}
    </div>
  );
}
