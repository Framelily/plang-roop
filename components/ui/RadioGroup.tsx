'use client';

import styled from 'styled-components';

// Pixel Art Color Palette
const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  neonCyan: '#01CDFE',
  neonPink: '#FF71CE',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
};

const RadioGroupWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const GroupLabel = styled.span`
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: ${colors.neonCyan};
  text-transform: uppercase;
`;

const OptionsContainer = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const RadioLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-family: var(--font-terminal);
  font-size: 1rem;
  color: ${colors.text};
  transition: color 0.2s;

  &:hover {
    color: ${colors.neonPink};
  }
`;

const HiddenRadio = styled.input.attrs({ type: 'radio' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const StyledRadio = styled.div<{ $checked: boolean }>`
  width: 16px;
  height: 16px;
  background: ${colors.bgLight};
  border: 2px solid ${({ $checked }) => ($checked ? colors.neonPink : colors.border)};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;

  ${RadioLabel}:hover & {
    border-color: ${colors.neonPink};
    box-shadow: 0 0 8px ${colors.neonPink}40;
  }

  &::after {
    content: '';
    display: ${({ $checked }) => ($checked ? 'block' : 'none')};
    width: 8px;
    height: 8px;
    background: ${colors.neonPink};
  }
`;

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
}: RadioGroupProps) {
  return (
    <RadioGroupWrapper>
      {label && <GroupLabel>{label}</GroupLabel>}
      <OptionsContainer>
        {options.map((option) => (
          <RadioLabel key={option.value}>
            <HiddenRadio
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
            />
            <StyledRadio $checked={value === option.value} />
            <span>{option.label}</span>
          </RadioLabel>
        ))}
      </OptionsContainer>
    </RadioGroupWrapper>
  );
}
