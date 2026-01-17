'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes, css } from 'styled-components';
import DropZone from '@/components/DropZone';
import ProgressBar from '@/components/ProgressBar';
import FaviconPreview from '@/components/favicon/FaviconPreview';
import CropPreview from '@/components/favicon/CropPreview';
import { loadImage } from '@/lib/image/resize';
import { fitToSquare, generateAllFavicons, generateHtmlTags, type GeneratedFavicon } from '@/lib/favicon/generator';
import { createFaviconZip } from '@/lib/favicon/zip';
import { FAVICON_SIZES } from '@/lib/favicon/sizes';

const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  bgCard: '#16213e',
  primary: '#A855F7',
  neonPink: '#FF71CE',
  neonCyan: '#01CDFE',
  neonGreen: '#05FFA1',
  neonYellow: '#FFFB96',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
};

// Keyframe animations
const scanline = keyframes`
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100%);
  }
`;

const blink = keyframes`
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
`;

const glitch = keyframes`
  0% {
    transform: translate(0);
    text-shadow: -2px 0 ${colors.neonCyan}, 2px 0 ${colors.neonPink};
  }
  20% {
    transform: translate(-2px, 2px);
    text-shadow: 2px 0 ${colors.neonCyan}, -2px 0 ${colors.neonPink};
  }
  40% {
    transform: translate(-2px, -2px);
    text-shadow: 2px 0 ${colors.neonPink}, -2px 0 ${colors.neonCyan};
  }
  60% {
    transform: translate(2px, 2px);
    text-shadow: -2px 0 ${colors.neonPink}, 2px 0 ${colors.neonCyan};
  }
  80% {
    transform: translate(2px, -2px);
    text-shadow: -2px 0 ${colors.neonCyan}, 2px 0 ${colors.neonPink};
  }
  100% {
    transform: translate(0);
    text-shadow: -2px 0 ${colors.neonCyan}, 2px 0 ${colors.neonPink};
  }
`;

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${colors.bg};
  font-family: var(--font-terminal);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.3) 2px,
      rgba(0, 0, 0, 0.3) 4px
    );
    pointer-events: none;
    z-index: 1000;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: linear-gradient(
      transparent 50%,
      rgba(0, 0, 0, 0.1) 50%
    );
    background-size: 100% 4px;
    animation: ${scanline} 8s linear infinite;
    pointer-events: none;
    z-index: 1001;
    opacity: 0.1;
  }
`;

const Header = styled.header`
  border-bottom: 4px solid ${colors.border};
  background-color: ${colors.bgLight};
  position: relative;
  z-index: 1;
  image-rendering: pixelated;

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${colors.neonCyan}, ${colors.neonPink}, ${colors.primary});
  }
`;

const HeaderContent = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${colors.textMuted};
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-terminal);
  font-size: 1.25rem;
  transition: all 0.2s;
  padding: 0.5rem;

  &:hover {
    color: ${colors.neonCyan};
    text-shadow: 0 0 10px ${colors.neonCyan};
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const Divider = styled.div`
  width: 4px;
  height: 1.5rem;
  background: ${colors.border};
`;

const Title = styled.h1`
  font-family: var(--font-pixel);
  font-size: 0.875rem;
  color: ${colors.neonPink};
  text-shadow: 0 0 10px ${colors.neonPink}, 0 0 20px ${colors.neonPink};
  animation: ${glitch} 3s infinite;
  letter-spacing: 2px;

  @media (min-width: 640px) {
    font-size: 1rem;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const PixelButton = styled.button<{ $variant?: 'primary' | 'outline'; $size?: 'sm' | 'md' }>`
  font-family: var(--font-pixel);
  font-size: ${props => props.$size === 'sm' ? '0.5rem' : '0.625rem'};
  padding: ${props => props.$size === 'sm' ? '0.5rem 0.75rem' : '0.75rem 1rem'};
  border: 4px solid;
  cursor: pointer;
  transition: all 0.1s;
  image-rendering: pixelated;
  position: relative;
  text-transform: uppercase;
  letter-spacing: 1px;

  ${props => props.$variant === 'outline' ? css`
    background: transparent;
    border-color: ${colors.neonCyan};
    color: ${colors.neonCyan};
    box-shadow:
      4px 4px 0 ${colors.border},
      inset 0 0 20px rgba(1, 205, 254, 0.1);

    &:hover:not(:disabled) {
      background: rgba(1, 205, 254, 0.2);
      box-shadow:
        4px 4px 0 ${colors.border},
        0 0 20px ${colors.neonCyan},
        inset 0 0 20px rgba(1, 205, 254, 0.2);
      text-shadow: 0 0 10px ${colors.neonCyan};
    }
  ` : css`
    background: linear-gradient(180deg, ${colors.primary} 0%, #7C3AED 100%);
    border-color: ${colors.neonPink};
    color: ${colors.text};
    box-shadow:
      4px 4px 0 ${colors.border},
      inset 0 0 20px rgba(168, 85, 247, 0.3);

    &:hover:not(:disabled) {
      background: linear-gradient(180deg, #B366FF 0%, ${colors.primary} 100%);
      box-shadow:
        4px 4px 0 ${colors.border},
        0 0 20px ${colors.neonPink},
        inset 0 0 20px rgba(168, 85, 247, 0.5);
      text-shadow: 0 0 10px ${colors.neonPink};
    }
  `}

  &:active:not(:disabled) {
    transform: translate(4px, 4px);
    box-shadow: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Main = styled.main`
  max-width: 64rem;
  margin: 0 auto;
  width: 100%;
  flex: 1;
  padding: 2rem 1rem;
  position: relative;
  z-index: 1;
`;

const UploadSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionHeader = styled.div`
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-family: var(--font-pixel);
  font-size: 1rem;
  color: ${colors.neonGreen};
  text-shadow: 0 0 10px ${colors.neonGreen}, 0 0 20px ${colors.neonGreen};
  margin-bottom: 0.5rem;

  @media (min-width: 640px) {
    font-size: 1.25rem;
  }
`;

const SectionSubtitle = styled.p`
  font-family: var(--font-terminal);
  font-size: 1.25rem;
  color: ${colors.textMuted};
`;

const PixelCard = styled.div`
  background: ${colors.bgCard};
  border: 4px solid ${colors.border};
  padding: 1rem;
  position: relative;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.5);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${colors.neonCyan}, ${colors.neonPink});
  }
`;

const CardTitle = styled.h3`
  font-family: var(--font-pixel);
  font-size: 0.625rem;
  color: ${colors.neonYellow};
  margin-bottom: 0.75rem;
  text-shadow: 0 0 5px ${colors.neonYellow};
`;

const FeatureList = styled.ul`
  display: grid;
  gap: 0.5rem;
  font-size: 1.125rem;
  color: ${colors.textMuted};

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-terminal);

  svg {
    width: 1rem;
    height: 1rem;
    color: ${colors.neonGreen};
    flex-shrink: 0;
  }
`;

const EditorSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const GridContainer = styled.div`
  display: grid;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const ImagePreviewContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.bgLight};
  border: 2px dashed ${colors.border};
  padding: 1rem;
  min-height: 200px;
`;

const SourceImage = styled.img`
  max-height: 200px;
  max-width: 100%;
  object-fit: contain;
  image-rendering: pixelated;
`;

const ImageInfo = styled.p`
  margin-top: 0.5rem;
  font-family: var(--font-terminal);
  font-size: 1rem;
  color: ${colors.textMuted};
`;

const PlaceholderText = styled.p`
  font-family: var(--font-terminal);
  font-size: 1.25rem;
  color: ${colors.textMuted};
  text-align: center;
`;

const SettingsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
`;

const InputWrapper = styled.div`
  width: 16rem;
`;

const InputLabel = styled.label`
  display: block;
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: ${colors.neonCyan};
  margin-bottom: 0.5rem;
  text-shadow: 0 0 5px ${colors.neonCyan};
`;

const PixelInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  font-family: var(--font-terminal);
  font-size: 1.25rem;
  background: ${colors.bgLight};
  border: 4px solid ${colors.border};
  color: ${colors.text};
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: ${colors.neonCyan};
    box-shadow: 0 0 10px ${colors.neonCyan};
  }

  &::placeholder {
    color: ${colors.textMuted};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const ProgressContainer = styled.div`
  position: relative;
`;

const HtmlCodeSection = styled.div`
  overflow: hidden;
`;

const HtmlCodeToggle = styled.button`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: inherit;
`;

const HtmlCodeTitle = styled.h3`
  font-family: var(--font-pixel);
  font-size: 0.625rem;
  color: ${colors.neonYellow};
  text-shadow: 0 0 5px ${colors.neonYellow};
`;

const ChevronIcon = styled.svg<{ $isOpen: boolean }>`
  width: 1.25rem;
  height: 1.25rem;
  color: ${colors.textMuted};
  transition: transform 0.2s;
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0)'};
`;

const HtmlCodeContent = styled.div`
  margin-top: 1rem;
`;

const CodeBlock = styled.pre`
  overflow-x: auto;
  background: ${colors.bgLight};
  border: 2px solid ${colors.border};
  padding: 1rem;
  font-family: var(--font-terminal);
  font-size: 1rem;
  color: ${colors.neonGreen};
  line-height: 1.5;
`;

const CopyButton = styled(PixelButton)`
  margin-top: 0.75rem;
`;

const DropZoneWrapper = styled.div`
  .dropzone {
    background: ${colors.bgCard};
    border: 4px dashed ${colors.neonCyan};
    transition: all 0.2s;

    &:hover {
      border-color: ${colors.neonPink};
      box-shadow: 0 0 20px ${colors.neonPink};
    }
  }
`;

const BlinkingCursor = styled.span`
  animation: ${blink} 1s step-end infinite;
  color: ${colors.neonGreen};
`;

interface ImageInfo {
  name: string;
  originalWidth: number;
  originalHeight: number;
  dataUrl: string;
}

export default function FaviconGeneratorPage() {
  const router = useRouter();
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [favicons, setFavicons] = useState<GeneratedFavicon[]>([]);
  const [siteName, setSiteName] = useState('My Website');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' });
  const [showHtmlCode, setShowHtmlCode] = useState(false);

  // Handle file upload
  const handleFileSelect = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const img = await loadImage(dataUrl);

      setImageInfo({
        name: file.name,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
        dataUrl,
      });

      // Reset previous results
      setFavicons([]);
      setCroppedUrl(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // Generate favicons
  const handleGenerate = useCallback(async () => {
    if (!imageInfo) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: FAVICON_SIZES.length, name: 'Preparing...' });

    try {
      // Fit to square first
      const { url: squareUrl } = await fitToSquare(
        imageInfo.dataUrl,
        imageInfo.originalWidth,
        imageInfo.originalHeight
      );
      setCroppedUrl(squareUrl);

      // Generate all sizes
      const generatedFavicons = await generateAllFavicons(
        squareUrl,
        (current, total, name) => {
          setProgress({ current, total, name });
        }
      );

      setFavicons(generatedFavicons);
    } catch (error) {
      console.error('Favicon generation error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageInfo]);

  // Download ZIP
  const handleDownload = useCallback(async () => {
    if (favicons.length === 0) return;

    try {
      await createFaviconZip(favicons, siteName);
    } catch (error) {
      console.error('ZIP creation error:', error);
    }
  }, [favicons, siteName]);

  // Reset
  const handleReset = useCallback(() => {
    // Revoke old URLs
    if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    favicons.forEach((f) => URL.revokeObjectURL(f.url));

    setImageInfo(null);
    setCroppedUrl(null);
    setFavicons([]);
    setProgress({ current: 0, total: 0, name: '' });
  }, [croppedUrl, favicons]);

  const isSquare = imageInfo
    ? imageInfo.originalWidth === imageInfo.originalHeight
    : false;

  return (
    <PageContainer>
      <Header>
        <HeaderContent>
          <HeaderLeft>
            <BackButton onClick={() => router.push('/')}>
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              BACK
            </BackButton>
            <Divider />
            <Title>FAVICON GENERATOR</Title>
          </HeaderLeft>
          <HeaderRight>
            {favicons.length > 0 && (
              <>
                <PixelButton $variant="outline" $size="sm" onClick={handleReset}>
                  RESET
                </PixelButton>
                <PixelButton $size="sm" onClick={handleDownload}>
                  DOWNLOAD ZIP
                </PixelButton>
              </>
            )}
          </HeaderRight>
        </HeaderContent>
      </Header>

      <Main>
        {!imageInfo ? (
          <UploadSection>
            <SectionHeader>
              <SectionTitle>
                CREATE FAVICON PACKAGE<BlinkingCursor>_</BlinkingCursor>
              </SectionTitle>
              <SectionSubtitle>
                Upload an image to generate favicons for all platforms
              </SectionSubtitle>
            </SectionHeader>

            <DropZoneWrapper>
              <DropZone onFileSelect={handleFileSelect} />
            </DropZoneWrapper>

            <PixelCard>
              <CardTitle>WHAT YOU&apos;LL GET:</CardTitle>
              <FeatureList>
                {FAVICON_SIZES.map((size) => (
                  <FeatureItem key={size.name}>
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {size.name} ({size.size}x{size.size})
                  </FeatureItem>
                ))}
                <FeatureItem>
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  manifest.json (PWA)
                </FeatureItem>
                <FeatureItem>
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  HTML meta tags
                </FeatureItem>
              </FeatureList>
            </PixelCard>
          </UploadSection>
        ) : (
          <EditorSection>
            <GridContainer>
              <PixelCard>
                <CardTitle>SOURCE IMAGE</CardTitle>
                <ImagePreviewContainer>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <SourceImage
                    src={imageInfo.dataUrl}
                    alt={imageInfo.name}
                  />
                </ImagePreviewContainer>
                <ImageInfo>
                  {imageInfo.originalWidth} x {imageInfo.originalHeight}px
                  {!isSquare && ' (will be fitted to square)'}
                </ImageInfo>
              </PixelCard>

              <PixelCard>
                {favicons.length > 0 ? (
                  <FaviconPreview favicons={favicons} />
                ) : !isSquare ? (
                  <CropPreview
                    imageUrl={imageInfo.dataUrl}
                    originalWidth={imageInfo.originalWidth}
                    originalHeight={imageInfo.originalHeight}
                  />
                ) : (
                  <PlaceholderText>
                    Click &quot;GENERATE FAVICONS&quot; to create icons<BlinkingCursor>_</BlinkingCursor>
                  </PlaceholderText>
                )}
              </PixelCard>
            </GridContainer>

            <PixelCard>
              <SettingsContainer>
                <InputWrapper>
                  <InputLabel htmlFor="siteName">
                    SITE NAME (FOR MANIFEST.JSON)
                  </InputLabel>
                  <PixelInput
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="My Website"
                  />
                </InputWrapper>
                <ButtonGroup>
                  {favicons.length === 0 ? (
                    <PixelButton
                      onClick={handleGenerate}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'GENERATING...' : 'GENERATE FAVICONS'}
                    </PixelButton>
                  ) : (
                    <>
                      <PixelButton $variant="outline" onClick={handleReset}>
                        START OVER
                      </PixelButton>
                      <PixelButton onClick={handleDownload}>
                        DOWNLOAD ZIP
                      </PixelButton>
                    </>
                  )}
                </ButtonGroup>
              </SettingsContainer>
            </PixelCard>

            {isProcessing && (
              <PixelCard>
                <ProgressContainer>
                  <ProgressBar
                    current={progress.current}
                    total={progress.total}
                    label={`Generating: ${progress.name}`}
                  />
                </ProgressContainer>
              </PixelCard>
            )}

            {favicons.length > 0 && (
              <PixelCard>
                <HtmlCodeSection>
                  <HtmlCodeToggle
                    onClick={() => setShowHtmlCode(!showHtmlCode)}
                  >
                    <HtmlCodeTitle>HTML CODE</HtmlCodeTitle>
                    <ChevronIcon
                      $isOpen={showHtmlCode}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </ChevronIcon>
                  </HtmlCodeToggle>
                  {showHtmlCode && (
                    <HtmlCodeContent>
                      <CodeBlock>
                        {generateHtmlTags()}
                      </CodeBlock>
                      <CopyButton
                        $variant="outline"
                        $size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(generateHtmlTags());
                        }}
                      >
                        COPY TO CLIPBOARD
                      </CopyButton>
                    </HtmlCodeContent>
                  )}
                </HtmlCodeSection>
              </PixelCard>
            )}
          </EditorSection>
        )}
      </Main>
    </PageContainer>
  );
}
