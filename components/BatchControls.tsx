'use client';

import styled from 'styled-components';
import { Input, Checkbox, RadioGroup, Slider } from '@/components/ui';
import type { BatchOptions, ImageFormat } from '@/lib/types';
import { FORMAT_LABELS, SUPPORTED_FORMATS } from '@/lib/types';

// Pixel Art Color Palette
const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  bgCard: '#16213e',
  neonPink: '#FF71CE',
  neonCyan: '#01CDFE',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
};

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Section = styled.div``;

const SectionTitle = styled.h3`
  font-family: var(--font-pixel);
  font-size: 0.625rem;
  color: ${colors.neonPink};
  text-shadow: 0 0 10px ${colors.neonPink}60;
  margin: 0 0 1rem;
  text-transform: uppercase;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Divider = styled.div`
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    ${colors.border} 20%,
    ${colors.border} 80%,
    transparent
  );
`;

const HelpText = styled.p`
  font-family: var(--font-terminal);
  font-size: 0.875rem;
  color: ${colors.textMuted};
  margin: 0.5rem 0 0;

  &::before {
    content: '> ';
    color: ${colors.neonCyan};
  }
`;

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
    <ControlsContainer>
      {/* Resize Section */}
      <Section>
        <SectionTitle>Resize</SectionTitle>
        <FieldGroup>
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
        </FieldGroup>
      </Section>

      <Divider />

      {/* Format Section */}
      <Section>
        <SectionTitle>Output Format</SectionTitle>
        <FieldGroup>
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
        </FieldGroup>
      </Section>

      <Divider />

      {/* Quality Section */}
      <Section>
        <SectionTitle>Quality</SectionTitle>
        <Slider
          id="batch-quality"
          min={10}
          max={100}
          step={5}
          value={Math.round(options.quality * 100)}
          onChange={(e) => onChange({ quality: Number(e.target.value) / 100 })}
        />
        <HelpText>
          Lower quality = smaller file size (affects JPG & WebP)
        </HelpText>
      </Section>
    </ControlsContainer>
  );
}
