'use client';

import styled from 'styled-components';

// Soft UI Evolution Palette
const colors = {
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  bgCard: '#FFFFFF',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const RadioGroupWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const GroupLabel = styled.span`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  font-weight: 600;
`;

const OptionsContainer = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const RadioLabel = styled.label<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: 1px solid ${props => props.$checked ? colors.primary : colors.border};
  background-color: ${props => props.$checked ? colors.primaryLight : colors.bgCard};
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-heading);
  font-size: 0.813rem;
  font-weight: 600;
  color: ${props => props.$checked ? colors.primary : colors.textMuted};
  border-radius: 8px;

  &:hover {
    border-color: ${colors.primary};
    color: ${colors.primary};
  }

  input {
    display: none;
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
          <RadioLabel key={option.value} $checked={value === option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </RadioLabel>
        ))}
      </OptionsContainer>
    </RadioGroupWrapper>
  );
}
