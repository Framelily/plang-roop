'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import ImageQueue from '@/components/ImageQueue';
import BatchControls from '@/components/BatchControls';
import ProgressBar from '@/components/ProgressBar';
import { processBatch } from '@/lib/image/batchProcessor';
import { createZipFromProcessedImages } from '@/lib/image/zip';
import { downloadImage } from '@/lib/image/download';
import { loadImage } from '@/lib/image/resize';
import { formatFileSize, generateId } from '@/lib/utils';
import { getImageData, removeImageData, STORAGE_KEYS } from '@/lib/storage';
import type { ImageFile, BatchOptions, ImageFormat } from '@/lib/types';
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

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  background-color: ${colors.bg};
  display: flex;
  flex-direction: column;
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
`;

const SoftCard = styled.div`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  @media (min-width: 640px) {
    padding: 1.25rem;
  }
`;

const CardTitle = styled.h2`
  font-family: var(--font-heading);
  font-size: 0.875rem;
  color: ${colors.text};
  font-weight: 700;
  margin-bottom: 1rem;
`;

const CardSubtitle = styled.h3`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.textMuted};
  font-weight: 600;
  margin-bottom: 0.75rem;
`;

const EmptyText = styled.p`
  font-family: var(--font-body);
  font-size: 0.938rem;
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
  background: ${colors.bg};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PreviewImage = styled.img`
  max-height: 250px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 8px;

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
  font-family: var(--font-heading);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  font-weight: 600;
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
  font-family: var(--font-body);
  font-size: 0.875rem;
`;

const InfoLabel = styled.dt`
  color: ${colors.textMuted};
`;

const InfoValue = styled.dd`
  color: ${colors.text};
  font-weight: 500;
`;

const InfoValueGreen = styled.dd`
  color: ${colors.success};
  font-weight: 600;
`;

const EmptyPreview = styled.div`
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: ${colors.textMuted};
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;

  @media (min-width: 640px) {
    height: 300px;
  }
`;

const SuccessOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(248, 250, 252, 0.95);
  z-index: 100;
  gap: 16px;
`;

const SuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  background: ${colors.success};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const SuccessTitle = styled.h2`
  font-family: var(--font-heading);
  font-size: 1.25rem;
  color: ${colors.text};
  font-weight: 700;
`;

const SuccessCountdown = styled.p`
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: ${colors.textMuted};
`;

const LoadingContainer = styled.div`
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: ${colors.bg};
`;

const LoadingText = styled.div`
  font-family: var(--font-heading);
  font-size: 1rem;
  color: ${colors.primary};
  font-weight: 600;
`;

const StatsCard = styled(SoftCard)`
  margin-top: 1rem;
`;

const ProgressCard = styled(SoftCard)``;

const ImageQueueWrapper = styled.div``;

const BatchControlsWrapper = styled.div``;

const ProgressBarWrapper = styled.div``;

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
  useOriginalFormat: false,
  useCompression: false,
};

export default function BatchPage() {
  const router = useRouter();
  const t = useTranslations('batch');
  const tc = useTranslations('common');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options, setOptions] = useState<BatchOptions>(defaultOptions);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, file: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Load images from IndexedDB
  useEffect(() => {
    const loadStoredImages = async () => {
      const storedData = await getImageData(STORAGE_KEYS.BATCH_IMAGES);

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

  // Process all images and download ZIP
  const handleProcessAndDownload = useCallback(async () => {
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

      // Auto-download ZIP after processing
      const processedImages = results.filter((img) => img.processedImage);
      if (processedImages.length > 0) {
        await createZipFromProcessedImages(processedImages);
        setDownloadComplete(true);
        setCountdown(3);
      }
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [images, options]);

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
  const handleBack = useCallback(async () => {
    await removeImageData(STORAGE_KEYS.BATCH_IMAGES);
    router.push('/');
  }, [router]);

  // Countdown after download
  useEffect(() => {
    if (!downloadComplete) return;
    if (countdown <= 0) {
      removeImageData(STORAGE_KEYS.BATCH_IMAGES);
      router.push('/');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [downloadComplete, countdown, router]);

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
        <LoadingText>{tc('loading')}...</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title={t('title')}
        subtitle={String(images.length)}
        onBack={handleBack}
        actions={
          <>
            {hasProcessedImages && (
              <ActionButton $variant="outline" $size="sm" onClick={handleReset}>
                {tc('reset')}
              </ActionButton>
            )}
            <ActionButton
              $size="sm"
              onClick={handleProcessAndDownload}
              disabled={isProcessing || images.length === 0}
            >
              {isProcessing ? tc('processing') : tc('download')}
            </ActionButton>
          </>
        }
      />

      <Main>
        {/* Selected Images */}
        <SoftCard>
          <CardTitle>{t('selectedImages')}</CardTitle>

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
            <EmptyText>{t('noImages')}</EmptyText>
          )}
        </SoftCard>

        {/* Progress */}
        {isProcessing && (
          <ProgressCard>
            <ProgressBarWrapper>
              <ProgressBar
                current={progress.current}
                total={progress.total}
                label={progress.file ? t('processingLabel', { file: progress.file }) : t('starting')}
              />
            </ProgressBarWrapper>
          </ProgressCard>
        )}

        <ContentWrapper>
          {/* Controls */}
          <ControlsColumn>
            <SoftCard>
              <BatchControlsWrapper>
                <BatchControls
                  options={options}
                  onChange={handleOptionsChange}
                  originalWidth={selectedImage?.originalWidth}
                  originalHeight={selectedImage?.originalHeight}
                />
              </BatchControlsWrapper>
            </SoftCard>

            {/* Stats */}
            {hasProcessedImages && (
              <StatsCard>
                <CardSubtitle>{t('batchStats')}</CardSubtitle>
                <InfoList>
                  <InfoRow>
                    <InfoLabel>{t('totalOriginal')}</InfoLabel>
                    <InfoValue>{formatFileSize(totalOriginalSize)}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>{t('totalProcessed')}</InfoLabel>
                    <InfoValue>{formatFileSize(totalProcessedSize)}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>{t('saved')}</InfoLabel>
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
            <SoftCard>
              <PreviewHeader>
                <CardTitle>{t('preview')}</CardTitle>
                {selectedImage?.processedImage && (
                  <ActionButton
                    $variant="outline"
                    $size="sm"
                    onClick={handleDownloadSingle}
                  >
                    {tc('download')}
                  </ActionButton>
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
                <EmptyPreview>{t('selectToPreview')}</EmptyPreview>
              )}
            </SoftCard>
          </PreviewColumn>
        </ContentWrapper>
      </Main>

      {downloadComplete && (
        <SuccessOverlay>
          <SuccessIcon>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </SuccessIcon>
          <SuccessTitle>{t('downloadSuccess')}</SuccessTitle>
          <SuccessCountdown>{t('redirecting', { seconds: countdown })}</SuccessCountdown>
        </SuccessOverlay>
      )}
    </PageContainer>
  );
}
