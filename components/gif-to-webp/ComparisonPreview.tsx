'use client';

import styled from 'styled-components';
import { useTranslations } from 'next-intl';

const colors = {
  bgCard: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1E293B',
  textMuted: '#64748B',
  success: '#22C55E',
};

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Panel = styled.div`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const PanelLabel = styled.div`
  font-family: var(--font-heading);
  font-size: 0.8rem;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ImgFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
  min-height: 220px;

  img {
    max-width: 100%;
    max-height: 360px;
    height: auto;
    display: block;
  }
`;

const Stats = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.75rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.text};
`;

const Savings = styled.span<{ $positive: boolean }>`
  font-weight: 700;
  color: ${({ $positive }) => ($positive ? colors.success : colors.textMuted)};
`;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

interface ComparisonPreviewProps {
  originalUrl: string;
  outputUrl: string | null;
  originalSize: number;
  outputSize: number | null;
}

export default function ComparisonPreview({
  originalUrl,
  outputUrl,
  originalSize,
  outputSize,
}: ComparisonPreviewProps) {
  const t = useTranslations('gifToWebp');

  const savingsPct =
    outputSize !== null && originalSize > 0
      ? Math.round(((originalSize - outputSize) / originalSize) * 100)
      : null;

  return (
    <Wrap>
      <Pair>
        <Panel>
          <PanelLabel>{t('originalLabel')}</PanelLabel>
          <ImgFrame>
            {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF cannot use next/image */}
            <img src={originalUrl} alt={t('originalLabel')} />
          </ImgFrame>
        </Panel>
        <Panel>
          <PanelLabel>{t('convertedLabel')}</PanelLabel>
          <ImgFrame>
            {outputUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- animated WebP cannot use next/image
              <img src={outputUrl} alt={t('convertedLabel')} />
            ) : null}
          </ImgFrame>
        </Panel>
      </Pair>
      {outputSize !== null && savingsPct !== null && (
        <Stats>
          <span>
            {t('originalSize')} {formatBytes(originalSize)}
          </span>
          <span>→</span>
          <span>
            {t('convertedSize')} {formatBytes(outputSize)}
          </span>
          <Savings $positive={savingsPct > 0}>
            {t('savingsLabel', { percent: Math.max(0, savingsPct) })}
          </Savings>
        </Stats>
      )}
    </Wrap>
  );
}
