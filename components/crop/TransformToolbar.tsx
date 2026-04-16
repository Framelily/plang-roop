'use client';

import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import type { Transform } from '@/lib/types';

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

const Buttons = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
`;

const IconBtn = styled.button<{ $active?: boolean }>`
  height: 40px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => ($active ? colors.primary : colors.border)};
  background: ${({ $active }) => ($active ? colors.primaryLight : colors.bgCard)};
  color: ${({ $active }) => ($active ? colors.primary : colors.text)};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${colors.primary};
    background: ${colors.primaryLight};
    color: ${colors.primary};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

interface TransformToolbarProps {
  value: Transform;
  onChange: (next: Transform) => void;
}

function rotateBy(current: 0 | 90 | 180 | 270, delta: 90 | -90 | 180): 0 | 90 | 180 | 270 {
  const r = (((current + delta) % 360) + 360) % 360;
  return r as 0 | 90 | 180 | 270;
}

export default function TransformToolbar({ value, onChange }: TransformToolbarProps) {
  const t = useTranslations('crop');

  return (
    <Wrapper>
      <Label>{t('transform')}</Label>
      <Buttons>
        <IconBtn
          type="button"
          title={t('rotate90ccw')}
          aria-label={t('rotate90ccw')}
          onClick={() => onChange({ ...value, rotate: rotateBy(value.rotate, -90) })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" />
            <path d="M3 13a9 9 0 1 0 3-7" />
          </svg>
        </IconBtn>
        <IconBtn
          type="button"
          title={t('rotate90cw')}
          aria-label={t('rotate90cw')}
          onClick={() => onChange({ ...value, rotate: rotateBy(value.rotate, 90) })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" />
            <path d="M21 13a9 9 0 1 1-3-7" />
          </svg>
        </IconBtn>
        <IconBtn
          type="button"
          title={t('rotate180')}
          aria-label={t('rotate180')}
          onClick={() => onChange({ ...value, rotate: rotateBy(value.rotate, 180) })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9" />
            <path d="M3 4v6h6" />
          </svg>
        </IconBtn>
        <IconBtn
          type="button"
          $active={value.flipH}
          title={t('flipH')}
          aria-label={t('flipH')}
          onClick={() => onChange({ ...value, flipH: !value.flipH })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v18" />
            <path d="M4 8l4-4v16l-4-4z" />
            <path d="M20 8l-4-4v16l4-4z" />
          </svg>
        </IconBtn>
        <IconBtn
          type="button"
          $active={value.flipV}
          title={t('flipV')}
          aria-label={t('flipV')}
          onClick={() => onChange({ ...value, flipV: !value.flipV })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18" />
            <path d="M8 4l-4 4h16l-4-4z" />
            <path d="M8 20l-4-4h16l-4 4z" />
          </svg>
        </IconBtn>
      </Buttons>
    </Wrapper>
  );
}
