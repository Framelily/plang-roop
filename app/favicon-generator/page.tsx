'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import DropZone from '@/components/DropZone';
import ProgressBar from '@/components/ProgressBar';
import FaviconPreview from '@/components/favicon/FaviconPreview';
import CropPreview from '@/components/favicon/CropPreview';
import { loadImage } from '@/lib/image/resize';
import { fitToSquare, generateAllFavicons, generateHtmlTags, type GeneratedFavicon } from '@/lib/favicon/generator';
import { createFaviconZip } from '@/lib/favicon/zip';
import { FAVICON_SIZES } from '@/lib/favicon/sizes';

// Soft UI Evolution Palette
const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  success: '#22C55E',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${colors.bg};
  font-family: var(--font-body);
`;

const Header = styled.header`
  background-color: ${colors.bgCard};
  border-bottom: 1px solid ${colors.border};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 1;
`;

const HeaderContent = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (min-width: 640px) {
    padding: 1rem;
    flex-wrap: nowrap;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (min-width: 640px) {
    gap: 1rem;
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${colors.textMuted};
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.938rem;
  transition: all 0.2s;
  padding: 0.5rem;
  border-radius: 8px;

  &:hover {
    color: ${colors.primary};
    background: ${colors.primaryLight};
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  span {
    display: none;

    @media (min-width: 480px) {
      display: inline;
    }
  }

  @media (min-width: 640px) {
    gap: 0.5rem;
  }
`;

const Divider = styled.div`
  display: none;
  width: 1px;
  height: 1.5rem;
  background: ${colors.border};

  @media (min-width: 480px) {
    display: block;
  }
`;

const Title = styled.h1`
  font-family: var(--font-heading);
  font-size: 0.875rem;
  color: ${colors.text};
  font-weight: 700;

  @media (min-width: 480px) {
    font-size: 1rem;
  }

  @media (min-width: 640px) {
    font-size: 1.125rem;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'outline'; $size?: 'sm' | 'md' }>`
  font-family: var(--font-heading);
  font-size: ${props => props.$size === 'sm' ? '0.813rem' : '0.875rem'};
  padding: ${props => props.$size === 'sm' ? '8px 16px' : '10px 20px'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;

  ${props => props.$variant === 'outline' ? `
    background: transparent;
    border: 1px solid ${colors.border};
    color: ${colors.textMuted};

    &:hover:not(:disabled) {
      border-color: ${colors.primary};
      color: ${colors.primary};
      background: ${colors.primaryLight};
    }
  ` : `
    background: ${colors.primary};
    border: 1px solid ${colors.primary};
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
  `}

  &:active:not(:disabled) {
    transform: translateY(0);
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
  padding: 1rem 0.75rem;
  position: relative;
  z-index: 1;

  @media (min-width: 640px) {
    padding: 2rem 1rem;
  }
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
  font-family: var(--font-heading);
  font-size: 1.25rem;
  color: ${colors.text};
  font-weight: 700;
  margin-bottom: 0.5rem;

  @media (min-width: 640px) {
    font-size: 1.5rem;
  }
`;

const SectionSubtitle = styled.p`
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: ${colors.textMuted};

  @media (min-width: 640px) {
    font-size: 1rem;
  }
`;

const SoftCard = styled.div`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  @media (min-width: 640px) {
    padding: 1.25rem;
  }
`;

const CardTitle = styled.h3`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.text};
  font-weight: 700;
  margin-bottom: 0.75rem;
`;

const FeatureList = styled.ul`
  display: grid;
  gap: 0.5rem;
  font-size: 0.938rem;
  color: ${colors.textMuted};

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-body);

  svg {
    width: 1rem;
    height: 1rem;
    color: ${colors.success};
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
  background: ${colors.bg};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  padding: 1rem;
  min-height: 200px;
`;

const SourceImage = styled.img`
  max-height: 200px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 8px;
`;

const ImageInfo = styled.p`
  margin-top: 0.5rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.textMuted};
`;

const PlaceholderText = styled.p`
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: ${colors.textMuted};
  text-align: center;
  padding: 2rem 0;
`;

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 640px) {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
  }
`;

const InputWrapper = styled.div`
  width: 100%;

  @media (min-width: 640px) {
    width: 16rem;
  }
`;

const InputLabel = styled.label`
  display: block;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const SoftInput = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem;
  font-family: var(--font-body);
  font-size: 0.938rem;
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 8px;
  color: ${colors.text};
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: ${colors.textMuted};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;

  @media (min-width: 480px) {
    flex-direction: row;
    width: auto;
  }

  button {
    width: 100%;

    @media (min-width: 480px) {
      width: auto;
    }
  }
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
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.text};
  font-weight: 700;
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
  background: #F1F5F9;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  padding: 0.75rem;
  font-family: monospace;
  font-size: 0.75rem;
  color: ${colors.text};
  line-height: 1.5;

  @media (min-width: 640px) {
    padding: 1rem;
    font-size: 0.813rem;
  }
`;

const CopyButton = styled(ActionButton)`
  margin-top: 0.75rem;
  width: 100%;

  @media (min-width: 480px) {
    width: auto;
  }
`;

const DropZoneWrapper = styled.div``;

interface ImageInfo {
  name: string;
  originalWidth: number;
  originalHeight: number;
  dataUrl: string;
}

export default function FaviconGeneratorPage() {
  const router = useRouter();
  const t = useTranslations('favicon');
  const tc = useTranslations('common');
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

  // Generate favicons and download ZIP
  const handleGenerateAndDownload = useCallback(async () => {
    if (!imageInfo) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: FAVICON_SIZES.length, name: t('preparing') });

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

      // Auto-download ZIP after generating
      await createFaviconZip(generatedFavicons, siteName);
    } catch (error) {
      console.error('Favicon generation error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageInfo, siteName, t]);

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
              <span>{tc('back')}</span>
            </BackButton>
            <Divider />
            <Title>{t('title')}</Title>
          </HeaderLeft>
          <HeaderRight>
            {favicons.length > 0 && (
              <ActionButton $variant="outline" $size="sm" onClick={handleReset}>
                {tc('reset')}
              </ActionButton>
            )}
          </HeaderRight>
        </HeaderContent>
      </Header>

      <Main>
        {!imageInfo ? (
          <UploadSection>
            <SectionHeader>
              <SectionTitle>
                {t('createTitle')}
              </SectionTitle>
              <SectionSubtitle>
                {t('createSubtitle')}
              </SectionSubtitle>
            </SectionHeader>

            <DropZoneWrapper>
              <DropZone onFileSelect={handleFileSelect} />
            </DropZoneWrapper>

            <SoftCard>
              <CardTitle>{t('whatYouGet')}</CardTitle>
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
                  {t('pwa')}
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
                  {t('htmlTags')}
                </FeatureItem>
              </FeatureList>
            </SoftCard>
          </UploadSection>
        ) : (
          <EditorSection>
            <GridContainer>
              <SoftCard>
                <CardTitle>{t('sourceImage')}</CardTitle>
                <ImagePreviewContainer>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <SourceImage
                    src={imageInfo.dataUrl}
                    alt={imageInfo.name}
                  />
                </ImagePreviewContainer>
                <ImageInfo>
                  {imageInfo.originalWidth} x {imageInfo.originalHeight}px
                  {!isSquare && ` ${t('willBeFitted')}`}
                </ImageInfo>
              </SoftCard>

              <SoftCard>
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
                    {t('clickToGenerate')}
                  </PlaceholderText>
                )}
              </SoftCard>
            </GridContainer>

            <SoftCard>
              <SettingsContainer>
                <InputWrapper>
                  <InputLabel htmlFor="siteName">
                    {t('siteName')}
                  </InputLabel>
                  <SoftInput
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="My Website"
                  />
                </InputWrapper>
                <ButtonGroup>
                  {favicons.length > 0 && (
                    <ActionButton $variant="outline" onClick={handleReset}>
                      {t('startOver')}
                    </ActionButton>
                  )}
                  <ActionButton
                    onClick={handleGenerateAndDownload}
                    disabled={isProcessing}
                  >
                    {isProcessing ? t('generating') : t('downloadZip')}
                  </ActionButton>
                </ButtonGroup>
              </SettingsContainer>
            </SoftCard>

            {isProcessing && (
              <SoftCard>
                <ProgressContainer>
                  <ProgressBar
                    current={progress.current}
                    total={progress.total}
                    label={t('generatingLabel', { name: progress.name })}
                  />
                </ProgressContainer>
              </SoftCard>
            )}

            {favicons.length > 0 && (
              <SoftCard>
                <HtmlCodeSection>
                  <HtmlCodeToggle
                    onClick={() => setShowHtmlCode(!showHtmlCode)}
                  >
                    <HtmlCodeTitle>{t('htmlCode')}</HtmlCodeTitle>
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
                        {t('copyToClipboard')}
                      </CopyButton>
                    </HtmlCodeContent>
                  )}
                </HtmlCodeSection>
              </SoftCard>
            )}
          </EditorSection>
        )}
      </Main>
    </PageContainer>
  );
}
