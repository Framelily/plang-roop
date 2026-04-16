'use client';

import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const colors = {
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const Wrapper = styled.div`
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 12px 12px 0;

  @media (min-width: 640px) {
    padding: 16px 16px 0;
  }
`;

const Card = styled.header`
  background-color: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  max-width: 72rem;
  margin: 0 auto;
`;

const Content = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.textMuted};
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.938rem;
  transition: all 0.2s;
  padding: 8px 12px;
  border-radius: 8px;

  &:hover {
    color: ${colors.primary};
    background: ${colors.primaryLight};
  }

  svg {
    width: 20px;
    height: 20px;
  }

  span {
    display: none;
    @media (min-width: 640px) {
      display: inline;
    }
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 24px;
  background-color: ${colors.border};

  @media (max-width: 640px) {
    display: none;
  }
`;

const TitleText = styled.h1`
  font-family: var(--font-heading);
  font-size: 1rem;
  color: ${colors.text};
  font-weight: 700;
  margin: 0;

  @media (min-width: 640px) {
    font-size: 1.125rem;
  }
`;

const Subtitle = styled.span`
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: ${colors.textMuted};
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
  showLanguageSwitcher?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  onBack,
  actions,
  showLanguageSwitcher = true,
}: PageHeaderProps) {
  const tc = useTranslations('common');

  return (
    <Wrapper>
      <Card>
        <Content>
          <Left>
            {onBack && (
              <BackButton type="button" onClick={onBack} aria-label={tc('back')}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span>{tc('back')}</span>
              </BackButton>
            )}
            {onBack && <Divider />}
            <TitleText>{title}</TitleText>
            {subtitle && <Subtitle title={subtitle}>{subtitle}</Subtitle>}
          </Left>
          <Right>
            {actions && <Actions>{actions}</Actions>}
            {showLanguageSwitcher && <LanguageSwitcher />}
          </Right>
        </Content>
      </Card>
    </Wrapper>
  );
}
