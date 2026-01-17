'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes, css } from 'styled-components';
import ImageQueue from '@/components/ImageQueue';
import BatchControls from '@/components/BatchControls';
import ProgressBar from '@/components/ProgressBar';
import { processBatch } from '@/lib/image/batchProcessor';
import { createZipFromProcessedImages } from '@/lib/image/zip';
import { downloadImage } from '@/lib/image/download';
import { loadImage } from '@/lib/image/resize';
import { formatFileSize, generateId } from '@/lib/utils';
import type { ImageFile, BatchOptions, ImageFormat } from '@/lib/types';

// Color Palette
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

// Keyframe Animations
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

const glowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 5px ${colors.primary}, 0 0 10px ${colors.primary};
  }
  50% {
    box-shadow: 0 0 10px ${colors.primary}, 0 0 20px ${colors.primary}, 0 0 30px ${colors.neonPink};
  }
`;

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  background-color: ${colors.bg};
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  /* CRT Scanline Effect */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 200%;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.15),
      rgba(0, 0, 0, 0.15) 1px,
      transparent 1px,
      transparent 2px
    );
    pointer-events: none;
    z-index: 1000;
    animation: ${scanline} 8s linear infinite;
  }

  &::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      ellipse at center,
      transparent 0%,
      rgba(0, 0, 0, 0.3) 100%
    );
    pointer-events: none;
    z-index: 999;
  }
`;

const Header = styled.header`
  border-bottom: 3px solid ${colors.border};
  background-color: ${colors.bgLight};
  position: relative;
  z-index: 10;

  &::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, ${colors.neonCyan}, ${colors.neonPink}, ${colors.neonGreen});
  }
`;

const HeaderContent = styled.div`
  max-width: 72rem;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem;
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
  font-family: var(--font-terminal);
  font-size: 1.25rem;
  transition: all 0.2s;
  padding: 0.5rem;

  &:hover {
    color: ${colors.neonCyan};
    text-shadow: 0 0 10px ${colors.neonCyan};
  }

  @media (min-width: 640px) {
    gap: 0.5rem;
  }
`;

const BackIcon = styled.svg`
  width: 1.25rem;
  height: 1.25rem;
`;

const BackText = styled.span`
  display: none;

  @media (min-width: 640px) {
    display: inline;
  }
`;

const Divider = styled.div`
  display: none;
  width: 2px;
  height: 1.5rem;
  background: ${colors.border};

  @media (min-width: 640px) {
    display: block;
  }
`;

const Title = styled.h1`
  font-family: var(--font-pixel);
  font-size: 0.75rem;
  color: ${colors.neonPink};
  text-shadow: 0 0 10px ${colors.neonPink}, 0 0 20px ${colors.neonPink};

  @media (min-width: 640px) {
    font-size: 1rem;
  }
`;

const ImageCount = styled.span`
  font-family: var(--font-terminal);
  font-size: 1.25rem;
  padding: 0.25rem 0.75rem;
  background: ${colors.bgCard};
  border: 2px solid ${colors.neonCyan};
  color: ${colors.neonCyan};
  box-shadow: 0 0 5px ${colors.neonCyan};
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (min-width: 640px) {
    gap: 0.75rem;
  }
`;

const PixelButton = styled.button<{ $variant?: 'primary' | 'outline'; $size?: 'sm' | 'md' }>`
  font-family: var(--font-pixel);
  font-size: ${props => props.$size === 'sm' ? '0.5rem' : '0.625rem'};
  padding: ${props => props.$size === 'sm' ? '0.5rem 0.75rem' : '0.75rem 1rem'};
  border: 3px solid;
  cursor: pointer;
  position: relative;
  transition: all 0.1s;
  text-transform: uppercase;

  ${props => props.$variant === 'outline' ? css`
    background: transparent;
    border-color: ${colors.neonCyan};
    color: ${colors.neonCyan};

    &:hover:not(:disabled) {
      background: ${colors.neonCyan};
      color: ${colors.bg};
      box-shadow: 0 0 15px ${colors.neonCyan};
    }
  ` : css`
    background: linear-gradient(180deg, ${colors.primary} 0%, #7C3AED 100%);
    border-color: ${colors.neonPink};
    color: ${colors.text};
    box-shadow: 0 4px 0 #5B21B6, 0 0 10px ${colors.primary};

    &:hover:not(:disabled) {
      transform: translateY(2px);
      box-shadow: 0 2px 0 #5B21B6, 0 0 20px ${colors.primary};
    }

    &:active:not(:disabled) {
      transform: translateY(4px);
      box-shadow: 0 0 0 #5B21B6, 0 0 20px ${colors.primary};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Pixel corners */
  &::before {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    width: 6px;
    height: 6px;
    background: ${colors.bg};
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -3px;
    right: -3px;
    width: 6px;
    height: 6px;
    background: ${colors.bg};
  }
`;

const Main = styled.main`
  max-width: 72rem;
  margin: 0 auto;
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem 1rem;
  position: relative;
  z-index: 10;
`;

const PixelCard = styled.div`
  background: ${colors.bgCard};
  border: 3px solid ${colors.border};
  padding: 1rem;
  position: relative;
  box-shadow:
    inset 0 0 30px rgba(0, 0, 0, 0.5),
    0 0 10px rgba(168, 85, 247, 0.2);

  /* Pixel corners */
  &::before {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    width: 8px;
    height: 8px;
    background: ${colors.bg};
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -3px;
    right: -3px;
    width: 8px;
    height: 8px;
    background: ${colors.bg};
  }
`;

const CardTitle = styled.h2`
  font-family: var(--font-pixel);
  font-size: 0.625rem;
  color: ${colors.neonGreen};
  margin-bottom: 1rem;
  text-shadow: 0 0 10px ${colors.neonGreen};
`;

const CardSubtitle = styled.h3`
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: ${colors.neonYellow};
  margin-bottom: 0.75rem;
  text-shadow: 0 0 5px ${colors.neonYellow};
`;

const EmptyText = styled.p`
  font-family: var(--font-terminal);
  font-size: 1.5rem;
  color: ${colors.textMuted};
  text-align: center;
  padding: 2rem 0;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    flex-direction: row;
  }
`;

const ControlsColumn = styled.div`
  width: 100%;

  @media (min-width: 1024px) {
    order: 2;
    width: 20rem;
    flex-shrink: 0;
  }
`;

const PreviewColumn = styled.div`
  flex: 1;

  @media (min-width: 1024px) {
    order: 1;
  }
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const PreviewContainer = styled.div`
  background: ${colors.bgLight};
  border: 2px dashed ${colors.border};
  border-radius: 4px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PreviewImage = styled.img`
  max-height: 250px;
  max-width: 100%;
  object-fit: contain;
  image-rendering: pixelated;

  @media (min-width: 640px) {
    max-height: 400px;
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;
`;

const InfoColumn = styled.div``;

const InfoTitle = styled.h4`
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: ${colors.neonCyan};
  margin-bottom: 0.5rem;
`;

const InfoList = styled.dl`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-family: var(--font-terminal);
  font-size: 1.25rem;
`;

const InfoLabel = styled.dt`
  color: ${colors.textMuted};
`;

const InfoValue = styled.dd`
  color: ${colors.text};
`;

const InfoValueGreen = styled.dd`
  color: ${colors.neonGreen};
  font-weight: 500;
`;

const EmptyPreview = styled.div`
  font-family: var(--font-terminal);
  font-size: 1.5rem;
  color: ${colors.textMuted};
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;

  @media (min-width: 640px) {
    height: 300px;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: ${colors.bg};
`;

const LoadingText = styled.div`
  font-family: var(--font-pixel);
  font-size: 0.75rem;
  color: ${colors.neonCyan};
  animation: ${blink} 1s step-end infinite;
`;

const StatsCard = styled(PixelCard)`
  margin-top: 1rem;
`;

const ProgressCard = styled(PixelCard)`
  animation: ${glowPulse} 2s ease-in-out infinite;
`;

const ImageQueueWrapper = styled.div`
  /* Style wrapper for ImageQueue component */
`;

const BatchControlsWrapper = styled.div`
  /* Style wrapper for BatchControls component */
`;

const ProgressBarWrapper = styled.div`
  /* Style wrapper for ProgressBar component */
`;

interface StoredImageData {
  name: string;
  originalWidth: number;
  originalHeight: number;
  size: number;
  type: string;
  dataUrl: string;
}

const defaultOptions: BatchOptions = {
  width: 0,
  height: 0,
  keepAspectRatio: true,
  format: 'jpeg',
  quality: 0.85,
  useOriginalFormat: true,
  useCompression: false,
};

export default function BatchPage() {
  const router = useRouter();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options, setOptions] = useState<BatchOptions>(defaultOptions);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, file: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Load images from sessionStorage
  useEffect(() => {
    const loadStoredImages = async () => {
      const storedData = sessionStorage.getItem('batchImages');

      if (!storedData) {
        setIsLoading(false);
        return;
      }

      try {
        const dataArray: StoredImageData[] = JSON.parse(storedData);
        const loadedImages: ImageFile[] = [];

        for (const data of dataArray) {
          const img = await loadImage(data.dataUrl);
          loadedImages.push({
            id: generateId(),
            file: new File([], data.name),
            name: data.name,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            size: data.size,
            type: data.type,
            previewUrl: data.dataUrl,
            status: 'pending',
          });
        }

        setImages(loadedImages);
        if (loadedImages.length > 0) {
          setSelectedId(loadedImages[0].id);
        }
      } catch (error) {
        console.error('Error loading images:', error);
      }

      setIsLoading(false);
    };

    loadStoredImages();
  }, []);

  // Remove image
  const handleRemove = useCallback((id: string) => {
    setImages((prev) => {
      const newImages = prev.filter((img) => img.id !== id);
      if (selectedId === id && newImages.length > 0) {
        setSelectedId(newImages[0].id);
      } else if (newImages.length === 0) {
        setSelectedId(null);
      }
      return newImages;
    });
  }, [selectedId]);

  // Update options
  const handleOptionsChange = useCallback((newOptions: Partial<BatchOptions>) => {
    setOptions((prev) => ({ ...prev, ...newOptions }));
  }, []);

  // Process all images
  const handleProcess = useCallback(async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: images.length, file: '' });

    // Mark all as processing
    setImages((prev) =>
      prev.map((img) => ({ ...img, status: 'processing' as const }))
    );

    try {
      const results = await processBatch(
        images,
        options,
        (completed, total, currentFile) => {
          setProgress({ current: completed, total, file: currentFile });

          // Update individual image status
          setImages((prev) =>
            prev.map((img, idx) => ({
              ...img,
              status: idx < completed ? 'completed' : idx === completed ? 'processing' : 'pending',
            }))
          );
        }
      );

      setImages(results);
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [images, options]);

  // Download all as ZIP
  const handleDownloadZip = useCallback(async () => {
    const processedImages = images.filter((img) => img.processedImage);
    if (processedImages.length === 0) return;

    try {
      await createZipFromProcessedImages(processedImages);
    } catch (error) {
      console.error('ZIP creation error:', error);
    }
  }, [images]);

  // Download single image
  const handleDownloadSingle = useCallback(() => {
    const selected = images.find((img) => img.id === selectedId);
    if (selected?.processedImage) {
      const format = selected.processedImage.format as ImageFormat;
      downloadImage(selected.processedImage.blob, selected.name, format);
    }
  }, [images, selectedId]);

  // Reset all
  const handleReset = useCallback(() => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        status: 'pending',
        processedImage: undefined,
        error: undefined,
      }))
    );
    setProgress({ current: 0, total: 0, file: '' });
  }, []);

  // Go back
  const handleBack = useCallback(() => {
    sessionStorage.removeItem('batchImages');
    router.push('/');
  }, [router]);

  const selectedImage = images.find((img) => img.id === selectedId);
  const hasProcessedImages = images.some((img) => img.processedImage);
  const allProcessed = images.every((img) => img.status === 'completed');

  // Calculate total stats
  const totalOriginalSize = images.reduce((sum, img) => sum + img.size, 0);
  const totalProcessedSize = images.reduce(
    (sum, img) => sum + (img.processedImage?.size || 0),
    0
  );

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingText>LOADING...</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <Header>
        <HeaderContent>
          <HeaderLeft>
            <BackButton onClick={handleBack}>
              <BackIcon
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
              </BackIcon>
              <BackText>BACK</BackText>
            </BackButton>
            <Divider />
            <Title>BATCH EDITOR</Title>
            <ImageCount>{images.length}</ImageCount>
          </HeaderLeft>
          <HeaderRight>
            {hasProcessedImages && (
              <PixelButton $variant="outline" $size="sm" onClick={handleReset}>
                Reset
              </PixelButton>
            )}
            {allProcessed ? (
              <PixelButton $size="sm" onClick={handleDownloadZip}>
                ZIP
              </PixelButton>
            ) : (
              <PixelButton
                $size="sm"
                onClick={handleProcess}
                disabled={isProcessing || images.length === 0}
              >
                {isProcessing ? 'Processing...' : 'Process All'}
              </PixelButton>
            )}
          </HeaderRight>
        </HeaderContent>
      </Header>

      <Main>
        {/* Selected Images */}
        <PixelCard>
          <CardTitle>SELECTED IMAGES</CardTitle>

          {images.length > 0 ? (
            <ImageQueueWrapper>
              <ImageQueue
                images={images}
                onRemove={handleRemove}
                selectedId={selectedId || undefined}
                onSelect={setSelectedId}
              />
            </ImageQueueWrapper>
          ) : (
            <EmptyText>NO IMAGES SELECTED. GO BACK TO SELECT IMAGES.</EmptyText>
          )}
        </PixelCard>

        {/* Progress */}
        {isProcessing && (
          <ProgressCard>
            <ProgressBarWrapper>
              <ProgressBar
                current={progress.current}
                total={progress.total}
                label={progress.file ? `Processing: ${progress.file}` : 'Starting...'}
              />
            </ProgressBarWrapper>
          </ProgressCard>
        )}

        <ContentWrapper>
          {/* Controls */}
          <ControlsColumn>
            <PixelCard>
              <BatchControlsWrapper>
                <BatchControls
                  options={options}
                  onChange={handleOptionsChange}
                  originalWidth={selectedImage?.originalWidth}
                  originalHeight={selectedImage?.originalHeight}
                />
              </BatchControlsWrapper>
            </PixelCard>

            {/* Stats */}
            {hasProcessedImages && (
              <StatsCard>
                <CardSubtitle>BATCH STATS</CardSubtitle>
                <InfoList>
                  <InfoRow>
                    <InfoLabel>Total Original</InfoLabel>
                    <InfoValue>{formatFileSize(totalOriginalSize)}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Total Processed</InfoLabel>
                    <InfoValue>{formatFileSize(totalProcessedSize)}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Saved</InfoLabel>
                    <InfoValueGreen>
                      {totalProcessedSize < totalOriginalSize
                        ? `-${Math.round(((totalOriginalSize - totalProcessedSize) / totalOriginalSize) * 100)}%`
                        : `+${Math.round(((totalProcessedSize - totalOriginalSize) / totalOriginalSize) * 100)}%`}
                    </InfoValueGreen>
                  </InfoRow>
                </InfoList>
              </StatsCard>
            )}
          </ControlsColumn>

          {/* Preview */}
          <PreviewColumn>
            <PixelCard>
              <PreviewHeader>
                <CardTitle>PREVIEW</CardTitle>
                {selectedImage?.processedImage && (
                  <PixelButton
                    $variant="outline"
                    $size="sm"
                    onClick={handleDownloadSingle}
                  >
                    Download
                  </PixelButton>
                )}
              </PreviewHeader>

              {selectedImage ? (
                <div>
                  <PreviewContainer>
                    <PreviewImage
                      src={
                        selectedImage.processedImage?.url ||
                        selectedImage.previewUrl
                      }
                      alt={selectedImage.name}
                    />
                  </PreviewContainer>

                  {/* Image Info */}
                  <InfoGrid>
                    <InfoColumn>
                      <InfoTitle>ORIGINAL</InfoTitle>
                      <InfoList>
                        <InfoRow>
                          <InfoLabel>Size</InfoLabel>
                          <InfoValue>{formatFileSize(selectedImage.size)}</InfoValue>
                        </InfoRow>
                        <InfoRow>
                          <InfoLabel>Dim</InfoLabel>
                          <InfoValue>
                            {selectedImage.originalWidth}x{selectedImage.originalHeight}
                          </InfoValue>
                        </InfoRow>
                      </InfoList>
                    </InfoColumn>

                    {selectedImage.processedImage && (
                      <InfoColumn>
                        <InfoTitle>PROCESSED</InfoTitle>
                        <InfoList>
                          <InfoRow>
                            <InfoLabel>Size</InfoLabel>
                            <InfoValue>
                              {formatFileSize(selectedImage.processedImage.size)}
                            </InfoValue>
                          </InfoRow>
                          <InfoRow>
                            <InfoLabel>Dim</InfoLabel>
                            <InfoValue>
                              {selectedImage.processedImage.width}x{selectedImage.processedImage.height}
                            </InfoValue>
                          </InfoRow>
                        </InfoList>
                      </InfoColumn>
                    )}
                  </InfoGrid>
                </div>
              ) : (
                <EmptyPreview>SELECT AN IMAGE TO PREVIEW</EmptyPreview>
              )}
            </PixelCard>
          </PreviewColumn>
        </ContentWrapper>
      </Main>
    </PageContainer>
  );
}
