'use client';

import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import type { CropRect } from '@/lib/types';

const colors = {
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Label = styled.div`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  color: ${colors.textMuted};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: ${colors.textMuted};
`;

const NumberInput = styled.input`
  height: 36px;
  padding: 0 0.75rem;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background: ${colors.bgCard};
  color: ${colors.text};
  font-family: var(--font-body);
  font-size: 0.875rem;
  outline: none;

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }
`;

interface Props {
  crop: CropRect;
  maxWidth: number;
  maxHeight: number;
  onChange: (next: CropRect) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function CropDimensions({ crop, maxWidth, maxHeight, onChange }: Props) {
  const t = useTranslations('crop');

  const handle = (key: keyof CropRect) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawStr = e.target.value;
    if (rawStr === '') return;
    const raw = Number(rawStr);
    if (Number.isNaN(raw)) return;
    const next: CropRect = { ...crop, [key]: Math.round(raw) };
    next.width = clamp(next.width, 1, maxWidth);
    next.height = clamp(next.height, 1, maxHeight);
    next.x = clamp(next.x, 0, maxWidth - next.width);
    next.y = clamp(next.y, 0, maxHeight - next.height);
    onChange(next);
  };

  const maxX = Math.max(0, maxWidth - Math.round(crop.width));
  const maxY = Math.max(0, maxHeight - Math.round(crop.height));

  return (
    <Wrapper>
      <Label>{t('dimensions')}</Label>
      <Grid>
        <Field>
          {t('width')}
          <NumberInput type="number" min={1} max={maxWidth} value={Math.round(crop.width)} onChange={handle('width')} />
        </Field>
        <Field>
          {t('height')}
          <NumberInput type="number" min={1} max={maxHeight} value={Math.round(crop.height)} onChange={handle('height')} />
        </Field>
        <Field>
          {t('x')}
          <NumberInput type="number" min={0} max={maxX} value={Math.round(crop.x)} onChange={handle('x')} />
        </Field>
        <Field>
          {t('y')}
          <NumberInput type="number" min={0} max={maxY} value={Math.round(crop.y)} onChange={handle('y')} />
        </Field>
      </Grid>
    </Wrapper>
  );
}
