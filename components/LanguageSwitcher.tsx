'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { locales, localeNames, type Locale } from '@/i18n/config';

const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  bgCard: '#16213e',
  primary: '#A855F7',
  neonPink: '#FF71CE',
  neonCyan: '#01CDFE',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
};

const SwitcherContainer = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const LangButton = styled.button<{ $active: boolean }>`
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${({ $active }) => ($active ? colors.primary : 'transparent')};
  color: ${({ $active }) => ($active ? colors.text : colors.textMuted)};
  border: 2px solid ${({ $active }) => ($active ? colors.neonPink : colors.border)};
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;

  ${({ $active }) =>
    $active &&
    `
    box-shadow: 0 0 10px ${colors.primary}60;
  `}

  &:hover {
    border-color: ${colors.neonCyan};
    color: ${({ $active }) => ($active ? colors.text : colors.neonCyan)};
  }

  &:first-child {
    border-radius: 0;
  }

  &:last-child {
    border-radius: 0;
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
