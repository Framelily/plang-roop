'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import styled from 'styled-components';

// Pixel Art Color Palette
const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  bgCard: '#16213e',
  neonCyan: '#01CDFE',
  neonPink: '#FF71CE',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
};

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const Label = styled.label`
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: ${colors.neonCyan};
  text-transform: uppercase;
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input<{ $hasSuffix?: boolean }>`
  width: 100%;
  padding: 0.625rem 0.75rem;
  padding-right: ${({ $hasSuffix }) => ($hasSuffix ? '3rem' : '0.75rem')};
  background: ${colors.bgLight};
  border: 2px solid ${colors.border};
  color: ${colors.text};
  font-family: var(--font-terminal);
  font-size: 1.125rem;
  transition: all 0.2s;

  &::placeholder {
    color: ${colors.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${colors.neonCyan};
    box-shadow: 0 0 10px ${colors.neonCyan}40;
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
`;

const Suffix = styled.span`
  position: absolute;
  right: 0.75rem;
  font-family: var(--font-terminal);
  font-size: 1rem;
  color: ${colors.textMuted};
`;

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, suffix, id, ...props }, ref) => {
    return (
      <InputWrapper>
        {label && <Label htmlFor={id}>{label}</Label>}
        <InputContainer>
          <StyledInput
            ref={ref}
            id={id}
            $hasSuffix={!!suffix}
            {...props}
          />
          {suffix && <Suffix>{suffix}</Suffix>}
        </InputContainer>
      </InputWrapper>
    );
  }
);

Input.displayName = 'Input';

export default Input;
