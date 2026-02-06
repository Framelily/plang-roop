'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { locales, localeNames, type Locale } from '@/i18n/config';

const colors = {
  primary: '#3B82F6',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const SwitcherContainer = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const LangButton = styled.button<{ $active: boolean }>`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  padding: 0.4rem 0.75rem;
  background: ${({ $active }) => ($active ? colors.primary : 'transparent')};
  color: ${({ $active }) => ($active ? '#FFFFFF' : colors.textMuted)};
  border: 1.5px solid ${({ $active }) => ($active ? colors.primary : colors.border)};
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  font-weight: 600;

  &:hover {
    border-color: ${colors.primary};
    color: ${({ $active }) => ($active ? '#FFFFFF' : colors.primary)};
  }
`;

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Set the locale cookie
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;

    // Refresh the page to apply the new locale
    router.refresh();
  };

  return (
    <SwitcherContainer>
      {locales.map((loc) => (
        <LangButton
          key={loc}
          $active={locale === loc}
          onClick={() => handleLocaleChange(loc)}
        >
          {loc.toUpperCase()}
        </LangButton>
      ))}
    </SwitcherContainer>
  );
}
