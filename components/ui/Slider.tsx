'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import styled from 'styled-components';

// Soft UI Evolution Palette
const colors = {
  primary: '#3B82F6',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const SliderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  font-weight: 600;
`;

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ValueDisplay = styled.span`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.primary};
  font-weight: 600;
  min-width: 40px;
  text-align: right;
`;

const StyledSlider = styled.input`
  flex: 1;
  -webkit-appearance: none;
  height: 6px;
  background: ${colors.border};
  border: none;
  border-radius: 4px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    background: ${colors.primary};
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: ${colors.primary};
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }
`;

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValue?: boolean;
  suffix?: string;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, showValue = true, suffix = '%', id, value, min = 0, max = 100, ...props }, ref) => {
    return (
      <SliderWrapper>
        {label && <Label htmlFor={id}>{label}</Label>}
        <SliderRow>
          <StyledSlider
            type="range"
            ref={ref}
            id={id}
            value={value}
            min={min}
            max={max}
            {...props}
          />
          {showValue && (
            <ValueDisplay>
              {value}{suffix}
            </ValueDisplay>
          )}
        </SliderRow>
      </SliderWrapper>
    );
  }
);

Slider.displayName = 'Slider';

export default Slider;
