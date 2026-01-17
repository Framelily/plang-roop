'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import styled from 'styled-components';

// Pixel Art Color Palette
const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  neonCyan: '#01CDFE',
  neonPink: '#FF71CE',
  primary: '#A855F7',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
};

const SliderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Label = styled.label`
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: ${colors.neonCyan};
  text-transform: uppercase;
`;

const ValueDisplay = styled.span`
  font-family: var(--font-terminal);
  font-size: 1.25rem;
  color: ${colors.neonPink};
  text-shadow: 0 0 10px ${colors.neonPink}80;
`;

const StyledSlider = styled.input.attrs({ type: 'range' })`
  width: 100%;
  height: 8px;
  background: ${colors.bgLight};
  border: 2px solid ${colors.border};
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: ${colors.primary};
    border: 2px solid ${colors.neonPink};
    cursor: pointer;
    transition: all 0.2s;
  }

  &::-webkit-slider-thumb:hover {
    background: ${colors.neonPink};
    box-shadow: 0 0 15px ${colors.neonPink}80;
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: ${colors.primary};
    border: 2px solid ${colors.neonPink};
    cursor: pointer;
    transition: all 0.2s;
  }

  &::-moz-range-thumb:hover {
    background: ${colors.neonPink};
    box-shadow: 0 0 15px ${colors.neonPink}80;
  }

  &:focus {
    outline: none;
  }

  &::-webkit-slider-runnable-track {
    background: linear-gradient(
      to right,
      ${colors.primary} 0%,
      ${colors.primary} var(--progress, 50%),
      ${colors.bgLight} var(--progress, 50%),
      ${colors.bgLight} 100%
    );
  }
`;

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValue?: boolean;
  suffix?: string;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, showValue = true, suffix = '%', id, value, min = 0, max = 100, ...props }, ref) => {
    const progress = ((Number(value) - Number(min)) / (Number(max) - Number(min))) * 100;

    return (
      <SliderWrapper>
        {(label || showValue) && (
          <LabelRow>
            {label && <Label htmlFor={id}>{label}</Label>}
            {showValue && (
              <ValueDisplay>
                {value}{suffix}
              </ValueDisplay>
            )}
          </LabelRow>
        )}
        <StyledSlider
          ref={ref}
          id={id}
          value={value}
          min={min}
          max={max}
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
          {...props}
        />
      </SliderWrapper>
    );
  }
);

Slider.displayName = 'Slider';

export default Slider;
