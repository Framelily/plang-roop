'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { ConfigProvider, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import DropZone from '@/components/DropZone';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { storeImageData, STORAGE_KEYS } from '@/lib/storage';

// Pixel Art Color Palette
const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  bgCard: '#16213e',
  primary: '#A855F7',
  secondary: '#6366F1',
  cta: '#F43F5E',
  ctaHover: '#FB7185',
  success: '#10B981',
  warning: '#FBBF24',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
  neonPink: '#FF71CE',
  neonCyan: '#01CDFE',
  neonGreen: '#05FFA1',
};


// Animations
const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const glowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 5px ${colors.primary}, 0 0 10px ${colors.primary}, 0 0 20px ${colors.primary};
  }
  50% {
    box-shadow: 0 0 10px ${colors.primary}, 0 0 20px ${colors.primary}, 0 0 40px ${colors.primary};
  }
`;

const scanline = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

const floatAround = keyframes`
  0% { transform: translate(-40vw, -30vh) rotate(0deg); }
  20% { transform: translate(30vw, -20vh) rotate(10deg); }
  40% { transform: translate(35vw, 25vh) rotate(-5deg); }
  60% { transform: translate(-30vw, 30vh) rotate(8deg); }
  80% { transform: translate(-35vw, -10vh) rotate(-8deg); }
  100% { transform: translate(-40vw, -30vh) rotate(0deg); }
`;

const FloatingHead = styled.img<{ $top: string; $left: string; $delay: string; $duration: string; $visible: boolean }>`
  position: fixed;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  opacity: ${({ $visible }) => ($visible ? 0.15 : 0)};
  pointer-events: none;
  z-index: 1;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  animation: ${floatAround} ${({ $duration }) => $duration} ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay};
  transition: opacity 1.5s ease-in-out;
`;

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.bg};
  display: flex;
  flex-direction: column;
  font-family: var(--font-terminal);
  position: relative;
  overflow: hidden;

  /* CRT Scanline Effect */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.15),
      rgba(0, 0, 0, 0.15) 1px,
      transparent 1px,
      transparent 2px
    );
    pointer-events: none;
    z-index: 100;
  }
`;

const Header = styled.header`
  background: ${colors.bgLight};
  border-bottom: 3px solid ${colors.primary};
  position: relative;
  z-index: 10;

  &::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${colors.neonPink}, ${colors.primary}, ${colors.neonCyan});
  }
`;

const HeaderContent = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const logoPulse = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 8px ${colors.neonCyan}) drop-shadow(0 0 15px ${colors.neonPink}40);
  }
  50% {
    filter: drop-shadow(0 0 12px ${colors.neonCyan}) drop-shadow(0 0 25px ${colors.neonPink}60);
  }
`;

const glitchEffect = keyframes`
  0%, 90%, 100% {
    transform: translate(0);
  }
  92% {
    transform: translate(-2px, 1px);
  }
  94% {
    transform: translate(2px, -1px);
  }
  96% {
    transform: translate(-1px, -1px);
  }
  98% {
    transform: translate(1px, 1px);
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.02);
  }
`;

const PixelIcon = styled.div`
  width: 40px;
  height: 40px;
  position: relative;
  animation: ${logoPulse} 3s ease-in-out infinite;

  /* Outer pixel frame */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, ${colors.neonPink}, ${colors.primary}, ${colors.neonCyan});
    clip-path: polygon(
      0% 20%, 20% 20%, 20% 0%,
      80% 0%, 80% 20%, 100% 20%,
      100% 80%, 80% 80%, 80% 100%,
      20% 100%, 20% 80%, 0% 80%
    );
  }

  /* Inner dark area */
  &::after {
    content: '';
    position: absolute;
    inset: 4px;
    background: ${colors.bg};
    clip-path: polygon(
      0% 20%, 20% 20%, 20% 0%,
      80% 0%, 80% 20%, 100% 20%,
      100% 80%, 80% 80%, 80% 100%,
      20% 100%, 20% 80%, 0% 80%
    );
  }

  svg {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    padding: 8px;
    color: ${colors.neonCyan};
  }
`;

const LogoText = styled.div`
  h1 {
    font-family: var(--font-pixel);
    font-size: 0.75rem;
    background: linear-gradient(90deg, ${colors.neonCyan}, ${colors.neonPink}, ${colors.neonCyan});
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: ${glitchEffect} 5s ease-in-out infinite;
    margin: 0;
    letter-spacing: 2px;

    @media (min-width: 640px) {
      font-size: 0.875rem;
    }
  }

  p {
    font-family: var(--font-terminal);
    font-size: 0.75rem;
    color: ${colors.neonGreen};
    margin: 0.25rem 0 0;

    &::before {
      content: '> ';
      color: ${colors.neonPink};
    }

    @media (min-width: 640px) {
      font-size: 0.875rem;
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
  position: relative;
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
  font-family: var(--font-pixel);
  font-size: 1.25rem;
  color: ${colors.text};
  text-shadow:
    2px 2px 0 ${colors.primary},
    4px 4px 0 ${colors.neonPink};
  margin: 0 0 1rem;
  line-height: 1.6;

  @media (min-width: 640px) {
    font-size: 1.5rem;
  }
`;

const HeroSubtitle = styled.p`
  font-family: var(--font-terminal);
  font-size: 1.25rem;
  color: ${colors.textMuted};
  margin: 0;
`;


const LoadingOverlay = styled.div`
  margin-top: 1rem;
  text-align: center;
`;

const LoadingText = styled.span`
  font-family: var(--font-terminal);
  font-size: 1.25rem;
  color: ${colors.neonCyan};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const ErrorMessage = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(244, 63, 94, 0.1);
  border: 2px solid ${colors.cta};
  color: ${colors.cta};
  font-family: var(--font-terminal);
  font-size: 1.125rem;
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
  border: 3px solid ${({ $clickable }) => ($clickable ? colors.cta : colors.border)};
  padding: 1rem;
  text-align: center;
  transition: all 0.2s;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  animation: ${float} 3s ease-in-out infinite;
  animation-delay: 0s;
  position: relative;

  ${({ $clickable }) =>
    $clickable &&
    css`
      box-shadow: 0 0 8px ${colors.cta}40;

      &::after {
        content: '→';
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        color: ${colors.cta};
        font-size: 0.875rem;
        opacity: 0.8;
      }
    `}

  &:hover {
    ${({ $clickable }) =>
      $clickable &&
      css`
        border-color: ${colors.cta};
        box-shadow:
          0 0 10px ${colors.cta},
          0 0 20px ${colors.cta},
          inset 0 0 20px rgba(244, 63, 94, 0.1);
        transform: translateY(-4px);
      `}
  }

  &:nth-child(2) { animation-delay: 0.5s; }
  &:nth-child(3) { animation-delay: 1s; }
  &:nth-child(4) { animation-delay: 1.5s; }
`;

const PixelFeatureIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  margin: 0 auto 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color};

  svg {
    width: 32px;
    height: 32px;
    filter: drop-shadow(0 0 6px ${({ $color }) => $color}80);
  }
`;

const FeatureTitle = styled.div`
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: ${colors.text};
  margin-bottom: 0.25rem;
`;

const FeatureDesc = styled.div`
  font-family: var(--font-terminal);
  font-size: 0.875rem;
  color: ${colors.textMuted};
`;

const Footer = styled.footer`
  background: ${colors.bgLight};
  border-top: 2px solid ${colors.border};
  padding: 1rem;
  text-align: center;
`;

const FooterText = styled.p`
  font-family: var(--font-terminal);
  font-size: 1rem;
  color: ${colors.textMuted};
  margin: 0 0 0.75rem;

  &::before {
    content: '> ';
    color: ${colors.neonGreen};
  }
`;

const FooterCreator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: var(--font-terminal);
  font-size: 0.875rem;
  color: ${colors.textMuted};
`;

const CreatorImage = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid ${colors.neonCyan};
  box-shadow: 0 0 8px ${colors.neonCyan}60;
`;

const CreatorName = styled.span`
  color: ${colors.neonCyan};
  font-weight: bold;
`;

export default function Home() {
  const router = useRouter();
  const t = useTranslations('home');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHead, setShowHead] = useState(false);

  // Random floating head appearance
  useEffect(() => {
    const scheduleNext = () => {
      // Random delay before showing (5-15 seconds)
      const hideDelay = Math.random() * 10000 + 5000;
      // Show duration (8-15 seconds)
      const showDuration = Math.random() * 7000 + 8000;

      setTimeout(() => {
        setShowHead(true);
        setTimeout(() => {
          setShowHead(false);
          scheduleNext();
        }, showDuration);
      }, hideDelay);
    };

    scheduleNext();
  }, []);

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
              const img = new Image();
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
                const img = new Image();
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
          borderRadius: 0,
          fontFamily: 'VT323, monospace',
        },
      }}
    >
      <PageContainer>
        {/* Floating head easter egg */}
        <FloatingHead src="/head.png" alt="" $top="50%" $left="50%" $delay="0s" $duration="25s" $visible={showHead} />

        <Header>
          <HeaderContent>
            <Logo>
              <LogoText>
                <h1>PLANG-ROOP</h1>
                <p>{t('tagline')}</p>
              </LogoText>
            </Logo>
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
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: colors.neonCyan }} spin />} />
                  {t('loadingImages')}
                </LoadingText>
              </LoadingOverlay>
            )}

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <FeaturesGrid>
              {/* RESIZE */}
              <FeatureCard>
                <PixelFeatureIcon $color={colors.neonCyan}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M14 10h4v4" />
                    <path d="M10 14H6v-4" />
                  </svg>
                </PixelFeatureIcon>
                <FeatureTitle>{t('featureResize')}</FeatureTitle>
                <FeatureDesc>{t('featureResizeDesc')}</FeatureDesc>
              </FeatureCard>
              {/* CONVERT */}
              <FeatureCard>
                <PixelFeatureIcon $color={colors.neonPink}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-9-9" />
                    <path d="M21 3v9h-9" />
                  </svg>
                </PixelFeatureIcon>
                <FeatureTitle>{t('featureConvert')}</FeatureTitle>
                <FeatureDesc>{t('featureConvertDesc')}</FeatureDesc>
              </FeatureCard>
              {/* BATCH */}
              <FeatureCard>
                <PixelFeatureIcon $color={colors.neonGreen}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="8" y="8" width="13" height="13" rx="1" />
                    <rect x="3" y="3" width="13" height="13" rx="1" />
                  </svg>
                </PixelFeatureIcon>
                <FeatureTitle>{t('featureBatch')}</FeatureTitle>
                <FeatureDesc>{t('featureBatchDesc')}</FeatureDesc>
              </FeatureCard>
              {/* FAVICON */}
              <FeatureCard
                $clickable
                onClick={() => router.push('/favicon-generator')}
              >
                <PixelFeatureIcon $color={colors.primary}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </PixelFeatureIcon>
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
