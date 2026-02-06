'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import styled from 'styled-components';

// Soft UI Evolution Palette
const colors = {
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  text: '#1E293B',
  border: '#E2E8F0',
};

const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px 0;

  &:hover span:first-of-type {
    border-color: ${colors.primary};
  }
`;

const HiddenCheckbox = styled.input`
  display: none;

  &:checked + span {
    background-color: ${colors.primary};
    border-color: ${colors.primary};

    &::after {
      content: '';
      display: block;
      width: 5px;
      height: 9px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
      margin: 1px auto 0;
    }
  }
`;

const CheckboxBox = styled.span`
  width: 18px;
  height: 18px;
  border: 1.5px solid ${colors.border};
  border-radius: 4px;
  background-color: ${colors.bgCard};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CheckboxText = styled.span`
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: ${colors.text};
`;

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, checked = false, ...props }, ref) => {
    return (
      <CheckboxWrapper htmlFor={id}>
        <HiddenCheckbox
          type="checkbox"
          ref={ref}
          id={id}
          checked={checked}
          {...props}
        />
        <CheckboxBox />
        <CheckboxText>{label}</CheckboxText>
      </CheckboxWrapper>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
