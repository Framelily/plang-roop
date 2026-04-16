'use client';

import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import { Slider, Checkbox, Button } from '@/components/ui';
import type { GifToWebpOptions } from '@/lib/gif-to-webp/types';

const colors = {
  bgCard: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1E293B',
  textMuted: '#64748B',
};

const Card = styled.div`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const SectionTitle = styled.h3`
  font-family: var(--font-heading);
  font-size: 0.95rem;
  color: ${colors.text};
  margin: 0;
`;

const Hint = styled.p`
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  margin: 0.25rem 0 0;
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

interface ConversionControlsProps {
  value: GifToWebpOptions;
  onChange: (next: GifToWebpOptions) => void;
  onConvert: () => void;
  busy: boolean;
}

export default function ConversionControls({
  value,
  onChange,
  onConvert,
  busy,
}: ConversionControlsProps) {
  const t = useTranslations('gifToWebp');

  return (
    <Card>
      <SectionTitle>{t('title')}</SectionTitle>

      <Row>
        <Slider
          label={t('quality')}
          min={1}
          max={100}
          value={value.quality}
          disabled={value.lossless || busy}
          onChange={(e) => onChange({ ...value, quality: Number(e.target.value) })}
        />
        <Hint>{t('qualityHint')}</Hint>
      </Row>

      <Row>
        <Checkbox
          id="gif-lossless"
          label={t('lossless')}
          checked={value.lossless}
          disabled={busy}
          onChange={(e) => onChange({ ...value, lossless: e.target.checked })}
        />
        <Hint>{t('losslessHint')}</Hint>
      </Row>

      <Row>
        <Checkbox
          id="gif-loop"
          label={t('loopInfinite')}
          checked={value.loopInfinite}
          disabled={busy}
          onChange={(e) => onChange({ ...value, loopInfinite: e.target.checked })}
        />
        <Hint>{t('loopHint')}</Hint>
      </Row>

      <Button onClick={onConvert} disabled={busy}>
        {busy ? t('converting') : t('convert')}
      </Button>
    </Card>
  );
}
