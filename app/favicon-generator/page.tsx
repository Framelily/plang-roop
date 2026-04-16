'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import DropZone from '@/components/DropZone';
import ProgressBar from '@/components/ProgressBar';
import FaviconPreview from '@/components/favicon/FaviconPreview';
import CropPreview from '@/components/favicon/CropPreview';
import {
  PageMain,
  PreviewArea,
  SidePanel,
  SectionCard,
  PageActions,
  ActionButton,
  Spinner,
} from '@/components/layout';
import { loadImage } from '@/lib/image/resize';
import { fitToSquare, generateAllFavicons, generateHtmlTags, type GeneratedFavicon } from '@/lib/favicon/generator';
import { createFaviconZip } from '@/lib/favicon/zip';
import { FAVICON_SIZES } from '@/lib/favicon/sizes';
import PageHeader from '@/components/PageHeader';

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

const ImageInfoText = styled.p`
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

const UploadSection = styled.div`
  max-width: 72rem;
  width: 100%;
  margin: 0 auto;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (min-width: 640px) {
    padding: 2rem 1rem;
  }
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

const CopyButton = styled.button`
  margin-top: 0.75rem;
  font-family: var(--font-heading);
  font-size: 0.813rem;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  background: transparent;
  border: 1px solid ${colors.border};
  color: ${colors.textMuted};

  &:hover:not(:disabled) {
    border-color: ${colors.primary};
    color: ${colors.primary};
    background: ${colors.primaryLight};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

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

  // Generate favicons and immediately download ZIP (one click)
  const handleGenerateAndDownload = useCallback(async () => {
    if (!imageInfo) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: FAVICON_SIZES.length, name: t('preparing') });

    try {
      const { url: squareUrl } = await fitToSquare(
        imageInfo.dataUrl,
        imageInfo.originalWidth,
        imageInfo.originalHeight
      );
      setCroppedUrl(squareUrl);

      const generatedFavicons = await generateAllFavicons(
        squareUrl,
        (current, total, name) => {
          setProgress({ current, total, name });
        }
      );

      setFavicons(generatedFavicons);
      await createFaviconZip(generatedFavicons, siteName);
    } catch (error) {
      console.error('Favicon generate/zip error:', error);
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
      <PageHeader
        title={t('title')}
        onBack={() => router.push('/')}
      />

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

          <DropZone onFileSelect={handleFileSelect} />

          <SectionCard>
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
          </SectionCard>
        </UploadSection>
      ) : (
        <PageMain>
          <PreviewArea>
            <SectionCard>
              <CardTitle>{t('sourceImage')}</CardTitle>
              <ImagePreviewContainer>
                <SourceImage
                  src={imageInfo.dataUrl}
                  alt={imageInfo.name}
                />
              </ImagePreviewContainer>
              <ImageInfoText>
                {imageInfo.originalWidth} x {imageInfo.originalHeight}px
                {!isSquare && ` ${t('willBeFitted')}`}
              </ImageInfoText>
            </SectionCard>

            <SectionCard>
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
            </SectionCard>

            {isProcessing && (
              <SectionCard>
                <ProgressBar
                  current={progress.current}
                  total={progress.total}
                  label={t('generatingLabel', { name: progress.name })}
                />
              </SectionCard>
            )}

            {favicons.length > 0 && (
              <SectionCard>
                <HtmlCodeToggle
                  type="button"
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
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generateHtmlTags());
                      }}
                    >
                      {t('copyToClipboard')}
                    </CopyButton>
                  </HtmlCodeContent>
                )}
              </SectionCard>
            )}
          </PreviewArea>

          <SidePanel>
            <SectionCard title={t('siteName')}>
              <SoftInput
                id="siteName"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="My Website"
              />
            </SectionCard>

            <SectionCard title={t('whatYouGet')}>
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
            </SectionCard>

            <PageActions>
              {favicons.length > 0 && (
                <ActionButton $variant="outline" onClick={handleReset}>
                  {t('startOver')}
                </ActionButton>
              )}
              <ActionButton
                $variant="primary"
                onClick={handleGenerateAndDownload}
                disabled={!imageInfo || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Spinner />
                    {t('generating')}
                  </>
                ) : (
                  t('generateButton')
                )}
              </ActionButton>
            </PageActions>
          </SidePanel>
        </PageMain>
      )}
    </PageContainer>
  );
}
