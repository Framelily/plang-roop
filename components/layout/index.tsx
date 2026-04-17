'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';

const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

export const PageMain = styled.main`
  flex: 1;
  max-width: 72rem;
  width: 100%;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 340px;
    align-items: start;
  }
`;

export const PreviewArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`;

export const SidePanel = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const CardOuter = styled.section`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

export const SectionLabel = styled.div`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  color: ${colors.textMuted};
  text-transform: uppercase;
  margin-bottom: 12px;
  font-weight: 700;
`;

interface SectionCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <CardOuter className={className}>
      {title && <SectionLabel>{title}</SectionLabel>}
      {children}
    </CardOuter>
  );
}

export const PageActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ButtonBase = styled.button<{ $variant: 'primary' | 'outline' }>`
  height: 44px;
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;

  ${({ $variant }) =>
    $variant === 'primary'
      ? `
        flex: 2;
        background: ${colors.primary};
        color: #ffffff;
        border: 1px solid ${colors.primary};

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
      `
      : `
        flex: 1;
        background: ${colors.bgCard};
        color: ${colors.text};
        border: 1px solid ${colors.border};

        &:hover:not(:disabled) {
          border-color: ${colors.primary};
          color: ${colors.primary};
          background: ${colors.primaryLight};
        }
      `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  $variant?: 'primary' | 'outline';
}

export function ActionButton({
  $variant = 'primary',
  type = 'button',
  children,
  ...props
}: ActionButtonProps) {
  return (
    <ButtonBase $variant={$variant} type={type} {...props}>
      {children}
    </ButtonBase>
  );
}

export const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const Pill = styled.button<{ $active: boolean }>`
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? colors.primary : colors.border)};
  background: ${({ $active }) => ($active ? colors.primary : colors.bgCard)};
  color: ${({ $active }) => ($active ? '#FFFFFF' : colors.text)};
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${colors.primary};
    background: ${({ $active }) => ($active ? colors.primary : colors.primaryLight)};
  }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export { colors as layoutColors };
