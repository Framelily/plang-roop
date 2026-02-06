'use client';

import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import { Input, Checkbox, RadioGroup, Slider } from '@/components/ui';
import type { BatchOptions, ImageFormat } from '@/lib/types';
import { FORMAT_LABELS, SUPPORTED_FORMATS } from '@/lib/types';

// Soft UI Evolution Palette
const colors = {
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const SectionTitle = styled.h3`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.text};
  font-weight: 700;
  margin-bottom: 16px;
`;

const InputGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: 640px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const SectionDivider = styled.div`
  height: 1px;
  background: ${colors.border};
  margin: 20px 0;
`;

const HelpText = styled.p`
  font-family: var(--font-body);
  font-size: 0.813rem;
  color: ${colors.textMuted};
  margin-top: 8px;
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
  const t = useTranslations('batchControls');
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
      <div>
        <SectionTitle>{t('resize')}</SectionTitle>
        <InputGrid>
          <Input
            id="batch-width"
            type="number"
            label={t('width')}
            suffix="px"
            value={options.width || ''}
            onChange={(e) => handleWidthChange(Number(e.target.value) || 0)}
            min={0}
            max={10000}
            placeholder={t('original')}
          />
          <Input
            id="batch-height"
            type="number"
            label={t('height')}
            suffix="px"
            value={options.height || ''}
            onChange={(e) => handleHeightChange(Number(e.target.value) || 0)}
            min={0}
            max={10000}
            placeholder={t('original')}
          />
        </InputGrid>
        <div style={{ marginTop: '12px' }}>
          <Checkbox
            id="batch-keepRatio"
            label={t('keepAspectRatio')}
            checked={options.keepAspectRatio}
            onChange={(e) => onChange({ keepAspectRatio: e.target.checked })}
          />
        </div>
      </div>

      <SectionDivider />

      {/* Format Section */}
      <div>
        <SectionTitle>{t('outputFormat')}</SectionTitle>
        <RadioGroup
          name="batch-format"
          value={options.format}
          onChange={(value) => onChange({ format: value as ImageFormat, useOriginalFormat: false })}
          options={formatOptions}
        />
      </div>

      <SectionDivider />

      {/* Quality Section */}
      <div>
        <SectionTitle>{t('quality')}</SectionTitle>
        <Slider
          id="batch-quality"
          min={10}
          max={100}
          step={5}
          value={Math.round(options.quality * 100)}
          onChange={(e) => onChange({ quality: Number(e.target.value) / 100 })}
        />
        <HelpText>
          {t('qualityHelp')}
        </HelpText>
      </div>
    </ControlsContainer>
  );
}
