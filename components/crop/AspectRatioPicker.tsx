'use client';

import styled from 'styled-components';
import { useTranslations } from 'next-intl';

const colors = {
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
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

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Pill = styled.button<{ $active: boolean }>`
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? colors.primary : colors.border)};
  background: ${({ $active }) => ($active ? colors.primary : colors.bgCard)};
  color: ${({ $active }) => ($active ? '#FFFFFF' : colors.text)};
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${colors.primary};
    background: ${({ $active }) => ($active ? colors.primary : colors.primaryLight)};
  }
`;

export interface AspectPreset {
  id: string;
  labelKey: 'free' | 'original' | null;
  label?: string;
  ratio: number | null;
}

interface AspectRatioPickerProps {
  value: string;
  onChange: (preset: AspectPreset) => void;
  originalRatio: number;
}

export default function AspectRatioPicker({
  value,
  onChange,
  originalRatio,
}: AspectRatioPickerProps) {
  const t = useTranslations('crop');

  const presets: AspectPreset[] = [
    { id: 'free', labelKey: 'free', ratio: null },
    { id: 'original', labelKey: 'original', ratio: originalRatio },
    { id: '1:1', labelKey: null, label: '1:1', ratio: 1 },
    { id: '4:3', labelKey: null, label: '4:3', ratio: 4 / 3 },
    { id: '16:9', labelKey: null, label: '16:9', ratio: 16 / 9 },
    { id: '3:4', labelKey: null, label: '3:4', ratio: 3 / 4 },
    { id: '9:16', labelKey: null, label: '9:16', ratio: 9 / 16 },
  ];

  return (
    <Wrapper>
      <Label>{t('aspectRatio')}</Label>
      <Pills>
        {presets.map((p) => (
          <Pill
            key={p.id}
            $active={value === p.id}
            onClick={() => onChange(p)}
            type="button"
          >
            {p.labelKey ? t(p.labelKey) : p.label}
          </Pill>
        ))}
      </Pills>
    </Wrapper>
  );
}
