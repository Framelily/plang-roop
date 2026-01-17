'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import styled from 'styled-components';

// Pixel Art Color Palette
const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  neonCyan: '#01CDFE',
  neonGreen: '#05FFA1',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
};

const CheckboxLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-family: 'VT323', monospace;
  font-size: 1rem;
  color: ${colors.text};
  transition: color 0.2s;

  &:hover {
    color: ${colors.neonCyan};
  }
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const StyledCheckbox = styled.div<{ $checked: boolean }>`
  width: 16px;
  height: 16px;
  background: ${({ $checked }) => ($checked ? colors.neonGreen : colors.bgLight)};
  border: 2px solid ${({ $checked }) => ($checked ? colors.neonGreen : colors.border)};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;

  ${CheckboxLabel}:hover & {
    border-color: ${colors.neonCyan};
    box-shadow: 0 0 8px ${colors.neonCyan}40;
  }

  &::after {
    content: '';
    display: ${({ $checked }) => ($checked ? 'block' : 'none')};
    width: 6px;
    height: 6px;
    background: ${colors.bg};
  }
`;

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, checked = false, ...props }, ref) => {
    return (
      <CheckboxLabel htmlFor={id}>
        <HiddenCheckbox ref={ref} id={id} checked={checked} {...props} />
        <StyledCheckbox $checked={!!checked} />
        <span>{label}</span>
      </CheckboxLabel>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
