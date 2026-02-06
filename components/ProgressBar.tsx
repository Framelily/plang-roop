'use client';

import styled from 'styled-components';

// Soft UI Evolution Palette
const colors = {
  primary: '#3B82F6',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

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
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.textMuted};
`;

const Percentage = styled.span`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.primary};
  font-weight: 600;
`;

const BarContainer = styled.div`
  height: 10px;
  width: 100%;
  background: ${colors.border};
  border-radius: 8px;
  overflow: hidden;
`;

const BarFill = styled.div<{ $percentage: number }>`
  height: 100%;
  width: ${({ $percentage }) => $percentage}%;
  background: ${colors.primary};
  border-radius: 8px;
  transition: width 0.3s ease;
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
