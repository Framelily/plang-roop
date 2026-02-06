'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import styled, { css } from 'styled-components';
import { ConfigProvider, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import DropZone from '@/components/DropZone';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { storeImageData, STORAGE_KEYS } from '@/lib/storage';
import Image from 'next/image';

// Soft UI Evolution Palette
const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  secondary: '#8B5CF6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.bg};
  display: flex;
  flex-direction: column;
  font-family: var(--font-body);
`;

const Header = styled.header`
  background: ${colors.bgCard};
  border-bottom: 1px solid ${colors.border};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 10;
`;

const HeaderContent = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  padding: 0.2rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.02);
  }
`;

const LogoIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.primaryLight};
  border-radius: 12px;

  svg {
    width: 24px;
    height: 24px;
    color: ${colors.primary};
  }
`;

const LogoText = styled.div`
  h1 {
    font-family: var(--font-heading);
    font-size: 1.125rem;
    color: ${colors.text};
    margin: 0;
    letter-spacing: 0.5px;

    @media (min-width: 640px) {
      font-size: 1.25rem;
    }
  }

  p {
    font-family: var(--font-body);
    font-size: 0.75rem;
    color: ${colors.textMuted};
    margin: 0.125rem 0 0;

    @media (min-width: 640px) {
      font-size: 0.8rem;
    }
  }
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
`;

const ContentWrapper = styled.div`
  width: 100%;
  max-width: 36rem;
`;

const HeroSection = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const HeroTitle = styled.h2`
  font-family: var(--font-heading);
  font-size: 1.5rem;
  color: ${colors.text};
  margin: 0 0 0.75rem;
  line-height: 1.4;

  @media (min-width: 640px) {
    font-size: 1.75rem;
  }
`;

const HeroSubtitle = styled.p`
  font-family: var(--font-body);
  font-size: 1rem;
  color: ${colors.textMuted};
  margin: 0;
`;

const LoadingOverlay = styled.div`
  margin-top: 1rem;
  text-align: center;
`;

const LoadingText = styled.span`
  font-family: var(--font-body);
  font-size: 1rem;
  color: ${colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const ErrorMessage = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #FEF2F2;
  border: 1px solid ${colors.error};
  border-radius: 12px;
  color: ${colors.error};
  font-family: var(--font-body);
  font-size: 0.875rem;
  text-align: center;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 2rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const FeatureCard = styled.div<{ $clickable?: boolean }>`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 1.25rem 1rem;
  text-align: center;
  transition: all 0.2s ease;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  ${({ $clickable }) =>
    $clickable &&
    css`
      border-color: ${colors.primary};

      &:hover {
        border-color: ${colors.primary};
        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
      }
    `}
`;

const FeatureIcon = styled.div<{ $bgColor: string; $color: string }>`
  width: 48px;
  height: 48px;
  margin: 0 auto 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bgColor }) => $bgColor};
  border-radius: 12px;

  svg {
    width: 24px;
    height: 24px;
    color: ${({ $color }) => $color};
  }
`;

const FeatureTitle = styled.div`
  font-family: var(--font-heading);
  font-size: 0.8rem;
  color: ${colors.text};
  margin-bottom: 0.25rem;
`;

const FeatureDesc = styled.div`
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: ${colors.textMuted};
`;

const Footer = styled.footer`
  background: ${colors.bgCard};
  border-top: 1px solid ${colors.border};
  padding: 1rem;
  text-align: center;
`;

const FooterText = styled.p`
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: ${colors.textMuted};
  margin: 0 0 0.75rem;
`;

const FooterCreator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: ${colors.textMuted};
`;

const CreatorImage = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid ${colors.border};
`;

const CreatorName = styled.span`
  color: ${colors.primary};
  font-weight: 700;
`;

export default function Home() {
  const router = useRouter();
  const t = useTranslations('home');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unified file handler - auto-detect single or batch
  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        // Single file → go to editor
        if (files.length === 1) {
          const file = files[0];
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });

          const dimensions = await new Promise<{ width: number; height: number }>(
            (resolve, reject) => {
              const img = new globalThis.Image();
              img.onload = () =>
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
              img.onerror = () => reject(new Error('Failed to load image'));
              img.src = dataUrl;
            }
          );

          sessionStorage.setItem(
            'pendingImage',
            JSON.stringify({
              name: file.name,
              originalWidth: dimensions.width,
              originalHeight: dimensions.height,
              size: file.size,
              type: file.type,
            })
          );

          // Use IndexedDB for large image data (sessionStorage has ~5MB limit)
          await storeImageData(STORAGE_KEYS.PENDING_IMAGE_DATA, dataUrl);
          router.push('/editor');
        }
        // Multiple files → go to batch
        else {
          const imageDataArray: Array<{
            name: string;
            originalWidth: number;
            originalHeight: number;
            size: number;
            type: string;
            dataUrl: string;
          }> = [];

          for (const file of files) {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            const dimensions = await new Promise<{ width: number; height: number }>(
              (resolve, reject) => {
                const img = new globalThis.Image();
                img.onload = () =>
                  resolve({ width: img.naturalWidth, height: img.naturalHeight });
                img.onerror = reject;
                img.src = dataUrl;
              }
            );

            imageDataArray.push({
              name: file.name,
              originalWidth: dimensions.width,
              originalHeight: dimensions.height,
              size: file.size,
              type: file.type,
              dataUrl,
            });
          }

          // Use IndexedDB for large image data (sessionStorage has ~5MB limit)
          await storeImageData(STORAGE_KEYS.BATCH_IMAGES, JSON.stringify(imageDataArray));
          router.push('/batch');
        }
      } catch (err) {
        console.error('File upload error:', err);
        setError(t('errorBatch'));
        setIsLoading(false);
      }
    },
    [router, t]
  );

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: colors.primary,
          borderRadius: 12,
          fontFamily: "'Nunito Sans', sans-serif",
        },
      }}
    >
      <PageContainer>
        <Header>
          <HeaderContent>
            <Image src="/logo.webp" alt="PLANG-ROOP" width={80} height={100} />
            <LanguageSwitcher />
          </HeaderContent>
        </Header>

        <MainContent>
          <ContentWrapper>
            <HeroSection>
              <HeroTitle>{t('heroTitle')}</HeroTitle>
              <HeroSubtitle>
                {t('heroSubtitle')}
              </HeroSubtitle>
            </HeroSection>

            <DropZone
              onFilesSelect={handleFiles}
              multiple
              disabled={isLoading}
            />

            {isLoading && (
              <LoadingOverlay>
                <LoadingText>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: colors.primary }} spin />} />
                  {t('loadingImages')}
                </LoadingText>
              </LoadingOverlay>
            )}

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <FeaturesGrid>
              {/* RESIZE */}
              <FeatureCard>
                <FeatureIcon $bgColor={colors.primaryLight} $color={colors.primary}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M14 10h4v4" />
                    <path d="M10 14H6v-4" />
                  </svg>
                </FeatureIcon>
                <FeatureTitle>{t('featureResize')}</FeatureTitle>
                <FeatureDesc>{t('featureResizeDesc')}</FeatureDesc>
              </FeatureCard>
              {/* CONVERT */}
              <FeatureCard>
                <FeatureIcon $bgColor="#EDE9FE" $color={colors.secondary}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-9-9" />
                    <path d="M21 3v9h-9" />
                  </svg>
                </FeatureIcon>
                <FeatureTitle>{t('featureConvert')}</FeatureTitle>
                <FeatureDesc>{t('featureConvertDesc')}</FeatureDesc>
              </FeatureCard>
              {/* BATCH */}
              <FeatureCard>
                <FeatureIcon $bgColor="#DCFCE7" $color={colors.success}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="8" y="8" width="13" height="13" rx="1" />
                    <rect x="3" y="3" width="13" height="13" rx="1" />
                  </svg>
                </FeatureIcon>
                <FeatureTitle>{t('featureBatch')}</FeatureTitle>
                <FeatureDesc>{t('featureBatchDesc')}</FeatureDesc>
              </FeatureCard>
              {/* FAVICON */}
              <FeatureCard
                $clickable
                onClick={() => router.push('/favicon-generator')}
              >
                <FeatureIcon $bgColor="#FEF3C7" $color={colors.warning}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </FeatureIcon>
                <FeatureTitle>{t('featureFavicon')}</FeatureTitle>
                <FeatureDesc>{t('featureFaviconDesc')}</FeatureDesc>
              </FeatureCard>
            </FeaturesGrid>
          </ContentWrapper>
        </MainContent>

        <Footer>
          <FooterText>
            {t('footer')}
          </FooterText>
          <FooterCreator>
            <span>Made by</span>
            <CreatorImage src="/head.png" alt="IT" />
            <CreatorName>IT</CreatorName>
            <span>× Generated with AI</span>
          </FooterCreator>
        </Footer>
      </PageContainer>
    </ConfigProvider>
  );
}
