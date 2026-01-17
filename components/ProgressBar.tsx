'use client';

import styled, { keyframes } from 'styled-components';

// Pixel Art Color Palette
const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  bgCard: '#16213e',
  neonPink: '#FF71CE',
  neonCyan: '#01CDFE',
  neonGreen: '#05FFA1',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
};

const pulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 5px ${colors.neonCyan}, inset 0 0 5px ${colors.neonCyan}40;
  }
  50% {
    box-shadow: 0 0 15px ${colors.neonCyan}, inset 0 0 10px ${colors.neonCyan}60;
  }
`;

const ProgressWrapper = styled.div`
  width: 100%;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const Label = styled.span`
  font-family: var(--font-terminal);
  font-size: 1rem;
  color: ${colors.textMuted};

  &::before {
    content: '> ';
    color: ${colors.neonCyan};
  }
`;

const Percentage = styled.span`
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: ${colors.neonGreen};
  text-shadow: 0 0 10px ${colors.neonGreen}80;
`;

const BarContainer = styled.div`
  height: 16px;
  width: 100%;
  background: ${colors.bgLight};
  border: 3px solid ${colors.border};
  position: relative;
  overflow: hidden;

  /* Pixel scanlines effect */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      ${colors.bg}40 2px,
      ${colors.bg}40 4px
    );
    pointer-events: none;
    z-index: 2;
  }
`;

const BarFill = styled.div<{ $percentage: number }>`
  height: 100%;
  width: ${({ $percentage }) => $percentage}%;
  background: linear-gradient(90deg, ${colors.neonCyan}, ${colors.neonGreen});
  transition: width 0.3s ease;
  position: relative;
  animation: ${pulse} 2s ease-in-out infinite;

  /* Pixel blocks effect */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 4px,
      ${colors.bg}20 4px,
      ${colors.bg}20 8px
    );
  }
`;

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
}

export default function ProgressBar({
  current,
  total,
  label,
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <ProgressWrapper>
      {(label || showPercentage) && (
        <LabelRow>
          {label && <Label>{label}</Label>}
          {showPercentage && (
            <Percentage>
              {percentage}% ({current}/{total})
            </Percentage>
          )}
        </LabelRow>
      )}
      <BarContainer>
        <BarFill $percentage={percentage} />
      </BarContainer>
    </ProgressWrapper>
  );
}
