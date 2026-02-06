'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import styled from 'styled-components';

// Soft UI Evolution Palette
const colors = {
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  font-weight: 600;
`;

const InputContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 8px;
  transition: all 0.2s;

  &:focus-within {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const StyledInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px 12px;
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: ${colors.text};
  outline: none;
  width: 100%;

  &::placeholder {
    color: ${colors.textMuted};
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type=number] {
    -moz-appearance: textfield;
  }
`;

const Suffix = styled.span`
  padding: 0 12px;
  font-family: var(--font-body);
  font-size: 0.813rem;
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
