'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { ConfigProvider, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import DropZone from '@/components/DropZone';

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

type Mode = 'single' | 'batch';

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

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const PixelIcon = styled.div`
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, ${colors.neonPink}, ${colors.primary});
  position: relative;

  /* Pixel corners */
  clip-path: polygon(
    0% 25%, 25% 25%, 25% 0%,
    75% 0%, 75% 25%, 100% 25%,
    100% 75%, 75% 75%, 75% 100%,
    25% 100%, 25% 75%, 0% 75%
  );

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    background: ${colors.bg};
  }
`;

const LogoText = styled.div`
  h1 {
    font-family: var(--font-pixel);
    font-size: 0.875rem;
    color: ${colors.neonCyan};
    text-shadow: 0 0 10px ${colors.neonCyan};
    margin: 0;
    letter-spacing: 2px;
  }

  p {
    font-family: var(--font-terminal);
    font-size: 0.875rem;
    color: ${colors.textMuted};
    margin: 0.25rem 0 0;
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

const ModeToggle = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const ModeButton = styled.button<{ $active: boolean }>`
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ $active }) => ($active ? colors.primary : colors.bgCard)};
  color: ${({ $active }) => ($active ? colors.bg : colors.text)};
  border: 2px solid ${({ $active }) => ($active ? colors.primary : colors.border)};
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${({ $active }) =>
    $active
      ? `0 0 15px ${colors.primary}80`
      : `3px 3px 0 ${colors.border}`};

  &:hover {
    background: ${({ $active }) => ($active ? colors.primary : colors.bgLight)};
    border-color: ${colors.primary};
  }

  &:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
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
  border: 3px solid ${colors.border};
  padding: 1rem;
  text-align: center;
  transition: all 0.2s;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  animation: ${float} 3s ease-in-out infinite;
  animation-delay: 0s;

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
  width: 40px;
  height: 40px;
  margin: 0 auto 0.5rem;
  background: ${({ $color }) => $color};
  position: relative;

  /* Simple pixel style */
  clip-path: polygon(
    0% 25%, 25% 25%, 25% 0%,
    75% 0%, 75% 25%, 100% 25%,
    100% 75%, 75% 75%, 75% 100%,
    25% 100%, 25% 75%, 0% 75%
  );

  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.bg};
  font-size: 20px;
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
  margin: 0;

  &::before {
    content: '> ';
    color: ${colors.neonGreen};
  }
`;

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('single');

  // Single file handler
  const handleSingleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const img = new Image();
          img.onload = () => {
            sessionStorage.setItem(
              'pendingImage',
              JSON.stringify({
                name: file.name,
                originalWidth: img.naturalWidth,
                originalHeight: img.naturalHeight,
                size: file.size,
                type: file.type,
              })
            );
            sessionStorage.setItem('pendingImageData', reader.result as string);
            router.push('/editor');
          };
          img.onerror = () => {
            setError('Failed to load image. Please try another file.');
            setIsLoading(false);
          };
          img.src = reader.result as string;
        };
        reader.onerror = () => {
          setError('Failed to read file. Please try again.');
          setIsLoading(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setError('An error occurred. Please try again.');
        setIsLoading(false);
      }
    },
    [router]
  );

  // Multiple files handler
  const handleMultipleFiles = useCallback(
    async (files: File[]) => {
      setIsLoading(true);
      setError(null);

      try {
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

        sessionStorage.setItem('batchImages', JSON.stringify(imageDataArray));
        router.push('/batch');
      } catch (err) {
        setError('Failed to load some images. Please try again.');
        setIsLoading(false);
      }
    },
    [router]
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
        <Header>
          <HeaderContent>
            <Logo>
              <PixelIcon />
              <LogoText>
                <h1>PLANG-ROOP</h1>
                <p>[ IMAGE CONVERTER ]</p>
              </LogoText>
            </Logo>
          </HeaderContent>
        </Header>

        <MainContent>
          <ContentWrapper>
            <HeroSection>
              <HeroTitle>CONVERT & RESIZE</HeroTitle>
              <HeroSubtitle>
                Upload your images to resize, convert format, and download
              </HeroSubtitle>
            </HeroSection>

            <ModeToggle>
              <ModeButton
                $active={mode === 'single'}
                onClick={() => setMode('single')}
              >
                SINGLE
              </ModeButton>
              <ModeButton
                $active={mode === 'batch'}
                onClick={() => setMode('batch')}
              >
                BATCH
              </ModeButton>
            </ModeToggle>

            {mode === 'single' ? (
              <DropZone onFileSelect={handleSingleFile} disabled={isLoading} />
            ) : (
              <DropZone
                onFilesSelect={handleMultipleFiles}
                multiple
                disabled={isLoading}
              />
            )}

            {isLoading && (
              <LoadingOverlay>
                <LoadingText>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: colors.neonCyan }} spin />} />
                  Loading {mode === 'batch' ? 'images' : 'image'}...
                </LoadingText>
              </LoadingOverlay>
            )}

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <FeaturesGrid>
              <FeatureCard>
                <PixelFeatureIcon $color={colors.neonCyan}>
                  <span style={{ fontSize: '16px' }}>+</span>
                </PixelFeatureIcon>
                <FeatureTitle>RESIZE</FeatureTitle>
                <FeatureDesc>Change dimensions</FeatureDesc>
              </FeatureCard>
              <FeatureCard>
                <PixelFeatureIcon $color={colors.neonPink}>
                  <span style={{ fontSize: '16px' }}>~</span>
                </PixelFeatureIcon>
                <FeatureTitle>CONVERT</FeatureTitle>
                <FeatureDesc>JPG, PNG, WebP</FeatureDesc>
              </FeatureCard>
              <FeatureCard>
                <PixelFeatureIcon $color={colors.neonGreen}>
                  <span style={{ fontSize: '16px' }}>#</span>
                </PixelFeatureIcon>
                <FeatureTitle>BATCH</FeatureTitle>
                <FeatureDesc>Process multiple</FeatureDesc>
              </FeatureCard>
              <FeatureCard
                $clickable
                onClick={() => router.push('/favicon-generator')}
              >
                <PixelFeatureIcon $color={colors.primary}>
                  <span style={{ fontSize: '16px' }}>*</span>
                </PixelFeatureIcon>
                <FeatureTitle>FAVICON</FeatureTitle>
                <FeatureDesc>Generate icons</FeatureDesc>
              </FeatureCard>
            </FeaturesGrid>
          </ContentWrapper>
        </MainContent>

        <Footer>
          <FooterText>
            All processing happens in your browser. No upload required.
          </FooterText>
        </Footer>
      </PageContainer>
    </ConfigProvider>
  );
}
