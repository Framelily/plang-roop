'use client';

import { Input, Checkbox, RadioGroup, Slider } from '@/components/ui';
import type { BatchOptions, ImageFormat } from '@/lib/types';
import { FORMAT_LABELS, SUPPORTED_FORMATS } from '@/lib/types';

interface BatchControlsProps {
  options: BatchOptions;
  onChange: (options: Partial<BatchOptions>) => void;
  originalWidth?: number;
  originalHeight?: number;
}

export default function BatchControls({
  options,
  onChange,
  originalWidth,
  originalHeight,
}: BatchControlsProps) {
  const handleWidthChange = (newWidth: number) => {
    if (options.keepAspectRatio && originalWidth && originalHeight) {
      const aspectRatio = originalWidth / originalHeight;
      onChange({
        width: newWidth,
        height: Math.round(newWidth / aspectRatio),
      });
    } else {
      onChange({ width: newWidth });
    }
  };

  const handleHeightChange = (newHeight: number) => {
    if (options.keepAspectRatio && originalWidth && originalHeight) {
      const aspectRatio = originalWidth / originalHeight;
      onChange({
        width: Math.round(newHeight * aspectRatio),
        height: newHeight,
      });
    } else {
      onChange({ height: newHeight });
    }
  };

  const formatOptions = SUPPORTED_FORMATS.map((format) => ({
    value: format,
    label: FORMAT_LABELS[format],
  }));

  return (
    <div className="space-y-6">
      {/* Resize Section */}
      <div>
        <h3 className="mb-4 font-medium text-zinc-900 dark:text-white">
          Resize
        </h3>
        <div className="space-y-4">
          <Input
            id="batch-width"
            type="number"
            label="Width"
            suffix="px"
            value={options.width || ''}
            onChange={(e) => handleWidthChange(Number(e.target.value) || 0)}
            min={0}
            max={10000}
            placeholder="Original"
          />
          <Input
            id="batch-height"
            type="number"
            label="Height"
            suffix="px"
            value={options.height || ''}
            onChange={(e) => handleHeightChange(Number(e.target.value) || 0)}
            min={0}
            max={10000}
            placeholder="Original"
          />
          <Checkbox
            id="batch-keepRatio"
            label="Keep aspect ratio"
            checked={options.keepAspectRatio}
            onChange={(e) => onChange({ keepAspectRatio: e.target.checked })}
          />
        </div>
      </div>

      <div className="h-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Format Section */}
      <div>
        <h3 className="mb-4 font-medium text-zinc-900 dark:text-white">
          Output Format
        </h3>
        <div className="space-y-3">
          <Checkbox
            id="batch-useOriginal"
            label="Keep original format"
            checked={options.useOriginalFormat}
            onChange={(e) => onChange({ useOriginalFormat: e.target.checked })}
          />
          {!options.useOriginalFormat && (
            <RadioGroup
              name="batch-format"
              value={options.format}
              onChange={(value) => onChange({ format: value as ImageFormat })}
              options={formatOptions}
            />
          )}
        </div>
      </div>

      <div className="h-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Quality Section */}
      <div>
        <h3 className="mb-4 font-medium text-zinc-900 dark:text-white">
          Quality
        </h3>
        <Slider
          id="batch-quality"
          min={10}
          max={100}
          step={5}
          value={Math.round(options.quality * 100)}
          onChange={(e) => onChange({ quality: Number(e.target.value) / 100 })}
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Lower quality = smaller file size (affects JPG & WebP)
        </p>
      </div>
    </div>
  );
}
