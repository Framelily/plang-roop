'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/hooks/useDebounce';
import { processImage } from '@/lib/image/resize';
import { downloadImage } from '@/lib/image/download';
import { mayContainExif } from '@/lib/image/exif';
import { formatFileSize, getFormatFromMimeType } from '@/lib/utils';
import { getImageData, removeImageData, STORAGE_KEYS } from '@/lib/storage';
import type { ImageFormat, ProcessedImage } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

// Soft UI Evolution Palette
const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  secondary: '#8B5CF6',
  success: '#22C55E',
  error: '#EF4444',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

// Functional animation only
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: ${colors.bg};
  font-family: var(--font-body);
  color: ${colors.text};
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
    background-color: transparent;
    border: 1px solid ${colors.border};
    color: ${colors.textMuted};

    &:hover:not(:disabled) {
      border-color: ${colors.primary};
      color: ${colors.primary};
      background: ${colors.primaryLight};
    }
  ` : `
    background-color: ${colors.primary};
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

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const Main = styled.main`
  max-width: 72rem;
  margin: 0 auto;
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px 16px;

  @media (min-width: 1024px) {
    flex-direction: row;
  }
`;

const ControlsSection = styled.div`
  width: 100%;

  @media (min-width: 1024px) {
    width: 320px;
    flex-shrink: 0;
    order: 2;
  }
`;

const Card = styled.div`
  background-color: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  @media (min-width: 640px) {
    padding: 20px;
  }
`;

const SectionTitle = styled.h3`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.text};
  font-weight: 700;
  margin-bottom: 16px;
`;

const SectionDivider = styled.div`
  height: 1px;
  background: ${colors.border};
  margin: 20px 0;
`;

const InputGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: 640px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const InputLabel = styled.label`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  font-weight: 600;
`;

const InputContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 8px;
  transition: all 0.2s;

  &:focus-within {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const StyledInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px 12px;
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: ${colors.text};
  outline: none;
  width: 100%;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type=number] {
    -moz-appearance: textfield;
  }
`;

const InputSuffix = styled.span`
  padding: 0 12px;
  font-family: var(--font-body);
  font-size: 0.813rem;
  color: ${colors.textMuted};
`;

const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px 0;

  &:hover span:first-of-type {
    border-color: ${colors.primary};
  }
`;

const CheckboxInput = styled.input`
  display: none;

  &:checked + span {
    background-color: ${colors.primary};
    border-color: ${colors.primary};

    &::after {
      content: '';
      display: block;
      width: 5px;
      height: 9px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
      margin: 1px auto 0;
    }
  }
`;

const CheckboxBox = styled.span`
  width: 18px;
  height: 18px;
  border: 1.5px solid ${colors.border};
  border-radius: 4px;
  background-color: ${colors.bgCard};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CheckboxLabel = styled.span`
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: ${colors.text};
`;

const RadioGroupWrapper = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const RadioLabel = styled.label<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: 1px solid ${props => props.$checked ? colors.primary : colors.border};
  background-color: ${props => props.$checked ? colors.primaryLight : colors.bgCard};
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-heading);
  font-size: 0.813rem;
  font-weight: 600;
  color: ${props => props.$checked ? colors.primary : colors.textMuted};
  border-radius: 8px;

  &:hover {
    border-color: ${colors.primary};
    color: ${colors.primary};
  }

  input {
    display: none;
  }
`;

const SliderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StyledSlider = styled.input`
  flex: 1;
  -webkit-appearance: none;
  height: 6px;
  background: ${colors.border};
  border: none;
  border-radius: 4px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    background: ${colors.primary};
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: ${colors.primary};
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }
`;

const SliderValue = styled.span`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.primary};
  font-weight: 600;
  min-width: 40px;
  text-align: right;
`;

const HelpText = styled.p`
  font-family: var(--font-body);
  font-size: 0.813rem;
  color: ${colors.textMuted};
  margin-top: 8px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 0;
  }
`;

const InfoBlock = styled.div``;

const InfoTitle = styled.h3`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  font-weight: 600;
  margin-bottom: 12px;

  @media (min-width: 1024px) {
    margin-top: 16px;
  }
`;

const InfoList = styled.dl`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
`;

const InfoLabel = styled.dt`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.textMuted};
`;

const InfoValue = styled.dd`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.text};
  font-weight: 500;
`;

const SavedValue = styled.dd<{ $positive: boolean }>`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  font-weight: 600;
  color: ${props => props.$positive ? colors.success : colors.error};
`;

const PreviewSection = styled.div`
  flex: 1;

  @media (min-width: 1024px) {
    order: 1;
  }
`;

const PreviewCard = styled(Card)``;

const PreviewHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const PreviewTitle = styled.h2`
  font-family: var(--font-heading);
  font-size: 0.875rem;
  color: ${colors.text};
  font-weight: 700;
`;

const PreviewInfo = styled.span`
  font-family: var(--font-body);
  font-size: 0.813rem;
  color: ${colors.textMuted};

  @media (min-width: 640px) {
    font-size: 0.875rem;
  }
`;

const PreviewContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${colors.bg};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  padding: 8px;
  position: relative;

  @media (min-width: 640px) {
    padding: 16px;
  }
`;

const PreviewImage = styled.img`
  max-height: 250px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 8px;

  @media (min-width: 640px) {
    max-height: 400px;
  }

  @media (min-width: 1024px) {
    max-height: 500px;
  }
`;

const ProcessingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(248, 250, 252, 0.8);
  border-radius: 12px;
  z-index: 10;
  gap: 12px;
`;

const ProcessingSpinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid ${colors.border};
  border-top: 3px solid ${colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const ProcessingLabel = styled.span`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  color: ${colors.primary};
  font-weight: 600;
`;

const FileName = styled.p`
  font-family: var(--font-body);
  font-size: 0.813rem;
  color: ${colors.textMuted};
  margin-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (min-width: 640px) {
    font-size: 0.875rem;
    margin-top: 12px;
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
  font-size: 32px;
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
  background-color: ${colors.bg};
`;

const LoadingText = styled.div`
  font-family: var(--font-heading);
  font-size: 1rem;
  color: ${colors.primary};
  font-weight: 600;
`;

interface StoredImageInfo {
  name: string;
  originalWidth: number;
  originalHeight: number;
  size: number;
  type: string;
}

// Custom Input Component
interface CustomInputProps {
  id: string;
  type?: string;
  label: string;
  suffix?: string;
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
}

function CustomInput({ id, type = 'text', label, suffix, value, onChange, min, max }: CustomInputProps) {
  return (
    <InputWrapper>
      <InputLabel htmlFor={id}>{label}</InputLabel>
      <InputContainer>
        <StyledInput
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
        />
        {suffix && <InputSuffix>{suffix}</InputSuffix>}
      </InputContainer>
    </InputWrapper>
  );
}

// Custom Checkbox Component
interface CustomCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function CustomCheckbox({ id, label, checked, onChange }: CustomCheckboxProps) {
  return (
    <CheckboxWrapper htmlFor={id}>
      <CheckboxInput
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
      />
      <CheckboxBox />
      <CheckboxLabel>{label}</CheckboxLabel>
    </CheckboxWrapper>
  );
}

// Custom RadioGroup Component
interface RadioOption {
  value: string;
  label: string;
}

interface CustomRadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
}

function CustomRadioGroup({ name, value, onChange, options }: CustomRadioGroupProps) {
  return (
    <RadioGroupWrapper>
      {options.map((option) => (
        <RadioLabel key={option.value} $checked={value === option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </RadioLabel>
      ))}
    </RadioGroupWrapper>
  );
}

// Custom Slider Component
interface CustomSliderProps {
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function CustomSlider({ id, min, max, step, value, onChange }: CustomSliderProps) {
  return (
    <SliderWrapper>
      <SliderContainer>
        <StyledSlider
          type="range"
          id={id}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
        />
        <SliderValue>{value}%</SliderValue>
      </SliderContainer>
    </SliderWrapper>
  );
}

export default function EditorPage() {
  const router = useRouter();
  const t = useTranslations('editor');
  const tc = useTranslations('common');
  const [imageInfo, setImageInfo] = useState<StoredImageInfo | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [quality, setQuality] = useState<number>(90);
  const [stripExif, setStripExif] = useState(true);

  // Processing state
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [lastProcessedKey, setLastProcessedKey] = useState('');
  const processCounterRef = useRef(0);
  const [resetCounter, setResetCounter] = useState(0);

  // Download success state
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Debounced values for auto-preview
  const debouncedWidth = useDebounce(width, 500);
  const debouncedHeight = useDebounce(height, 500);
  const debouncedFormat = useDebounce(format, 300);
  const debouncedQuality = useDebounce(quality, 500);

  // Derive processing state — all from state/props, no refs read during render
  const isDebouncing = width !== debouncedWidth || height !== debouncedHeight ||
    format !== debouncedFormat || quality !== debouncedQuality;
  const currentSettingsKey = `${debouncedWidth}-${debouncedHeight}-${debouncedFormat}-${debouncedQuality}-${keepAspectRatio}`;
  const isPreviewProcessing = isDebouncing ||
    (!!imageDataUrl && !isLoading && currentSettingsKey !== lastProcessedKey);

  // Load image from IndexedDB (with sessionStorage fallback for metadata)
  useEffect(() => {
    const loadImage = async () => {
      const storedInfo = sessionStorage.getItem('pendingImage');
      if (!storedInfo) {
        router.push('/');
        return;
      }

      // Try IndexedDB first for image data
      const storedData = await getImageData(STORAGE_KEYS.PENDING_IMAGE_DATA);
      if (!storedData) {
        router.push('/');
        return;
      }

      const info: StoredImageInfo = JSON.parse(storedInfo);
      setImageInfo(info);
      setImageDataUrl(storedData);
      setWidth(info.originalWidth);
      setHeight(info.originalHeight);
      setFormat(getFormatFromMimeType(info.type));
      setIsLoading(false);
    };

    loadImage();
  }, [router]);

  // Handle aspect ratio
  const handleWidthChange = useCallback(
    (newWidth: number) => {
      setWidth(newWidth);
      if (keepAspectRatio && imageInfo) {
        const aspectRatio = imageInfo.originalWidth / imageInfo.originalHeight;
        setHeight(Math.round(newWidth / aspectRatio));
      }
    },
    [keepAspectRatio, imageInfo]
  );

  const handleHeightChange = useCallback(
    (newHeight: number) => {
      setHeight(newHeight);
      if (keepAspectRatio && imageInfo) {
        const aspectRatio = imageInfo.originalWidth / imageInfo.originalHeight;
        setWidth(Math.round(newHeight * aspectRatio));
      }
    },
    [keepAspectRatio, imageInfo]
  );

  // Auto-preview: re-process whenever debounced settings change
  useEffect(() => {
    if (!imageDataUrl || !imageInfo || isLoading) return;
    if (debouncedWidth <= 0 || debouncedHeight <= 0) return;

    const settingsKey = `${debouncedWidth}-${debouncedHeight}-${debouncedFormat}-${debouncedQuality}-${keepAspectRatio}`;
    const currentCount = ++processCounterRef.current;

    processImage(
      imageDataUrl,
      imageInfo.originalWidth,
      imageInfo.originalHeight,
      {
        width: debouncedWidth,
        height: debouncedHeight,
        keepAspectRatio,
        format: debouncedFormat,
        quality: debouncedQuality / 100,
      }
    )
      .then((result) => {
        // Stale guard: only apply if this is still the latest request
        if (processCounterRef.current !== currentCount) {
          URL.revokeObjectURL(result.url);
          return;
        }
        setLastProcessedKey(settingsKey);
        setProcessedImage((prev) => {
          if (prev?.url) URL.revokeObjectURL(prev.url);
          return result;
        });
      })
      .catch((error) => {
        if (processCounterRef.current === currentCount) {
          console.error('Preview processing error:', error);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageDataUrl, imageInfo, isLoading, debouncedWidth, debouncedHeight, debouncedFormat, debouncedQuality, keepAspectRatio, resetCounter]);

  // Download
  const handleDownload = useCallback(() => {
    if (!processedImage || !imageInfo) return;
    downloadImage(processedImage.blob, imageInfo.name, format);
    setDownloadComplete(true);
    setCountdown(3);
  }, [processedImage, imageInfo, format]);

  // Countdown after download
  useEffect(() => {
    if (!downloadComplete) return;
    if (countdown <= 0) {
      sessionStorage.removeItem('pendingImage');
      removeImageData(STORAGE_KEYS.PENDING_IMAGE_DATA);
      if (processedImage?.url) URL.revokeObjectURL(processedImage.url);
      router.push('/');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [downloadComplete, countdown, router, processedImage]);

  // Reset to original
  const handleReset = useCallback(() => {
    if (imageInfo) {
      setWidth(imageInfo.originalWidth);
      setHeight(imageInfo.originalHeight);
      setFormat(getFormatFromMimeType(imageInfo.type));
      setQuality(90);
      setKeepAspectRatio(true);
      setLastProcessedKey('');
      if (processedImage?.url) {
        URL.revokeObjectURL(processedImage.url);
      }
      setProcessedImage(null);
      setResetCounter((c) => c + 1);
    }
  }, [imageInfo, processedImage]);

  // Go back to home
  const handleBack = useCallback(async () => {
    sessionStorage.removeItem('pendingImage');
    await removeImageData(STORAGE_KEYS.PENDING_IMAGE_DATA);
    if (processedImage?.url) {
      URL.revokeObjectURL(processedImage.url);
    }
    router.push('/');
  }, [router, processedImage]);

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingText>{tc('loading')}...</LoadingText>
      </LoadingContainer>
    );
  }

  if (!imageInfo || !imageDataUrl) {
    return null;
  }

  const displayImage = processedImage?.url || imageDataUrl;
  const displayWidth = processedImage?.width || imageInfo.originalWidth;
  const displayHeight = processedImage?.height || imageInfo.originalHeight;
  const displaySize = processedImage?.size || imageInfo.size;

  return (
    <PageContainer>
      <PageHeader
        title={t('title')}
        onBack={handleBack}
        actions={
          <>
            <ActionButton $variant="outline" $size="sm" onClick={handleReset}>
              {tc('reset')}
            </ActionButton>
            <ActionButton $size="sm" onClick={handleDownload} disabled={!processedImage || isPreviewProcessing}>
              {isPreviewProcessing ? '...' : tc('download')}
            </ActionButton>
          </>
        }
      />


      <Main>
        {/* Controls Section */}
        <ControlsSection>
          <Card>
            {/* Resize Section */}
            <div>
              <SectionTitle>{t('resize')}</SectionTitle>
              <InputGroup>
                <CustomInput
                  id="width"
                  type="number"
                  label={t('width')}
                  suffix="px"
                  value={width || ''}
                  onChange={(e) => handleWidthChange(Number(e.target.value) || 0)}
                  min={1}
                  max={10000}
                />
                <CustomInput
                  id="height"
                  type="number"
                  label={t('height')}
                  suffix="px"
                  value={height || ''}
                  onChange={(e) => handleHeightChange(Number(e.target.value) || 0)}
                  min={1}
                  max={10000}
                />
              </InputGroup>
              <div style={{ marginTop: '12px' }}>
                <CustomCheckbox
                  id="keepRatio"
                  label={t('keepAspectRatio')}
                  checked={keepAspectRatio}
                  onChange={(e) => setKeepAspectRatio(e.target.checked)}
                />
              </div>
            </div>

            <SectionDivider />

            {/* Format Section */}
            <div>
              <SectionTitle>{t('outputFormat')}</SectionTitle>
              <CustomRadioGroup
                name="format"
                value={format}
                onChange={(value) => setFormat(value as ImageFormat)}
                options={[
                  { value: 'jpeg', label: 'JPG' },
                  { value: 'png', label: 'PNG' },
                  { value: 'webp', label: 'WebP' },
                ]}
              />
            </div>

            <SectionDivider />

            {/* Quality Section */}
            <div>
              <SectionTitle>{t('quality')}</SectionTitle>
              <CustomSlider
                id="quality"
                min={10}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
              <HelpText>
                {t('qualityHelp')}
              </HelpText>
            </div>

            {/* EXIF Section - only show for JPEG */}
            {imageInfo && mayContainExif(imageInfo.type) && (
              <>
                <SectionDivider />
                <div>
                  <SectionTitle>{t('privacy')}</SectionTitle>
                  <CustomCheckbox
                    id="stripExif"
                    label={t('stripExif')}
                    checked={stripExif}
                    onChange={(e) => setStripExif(e.target.checked)}
                  />
                  <HelpText>
                    {t('stripExifHelp')}
                  </HelpText>
                </div>
              </>
            )}

            <SectionDivider />

            {/* Info Section */}
            <InfoGrid>
              <InfoBlock>
                <InfoTitle>{t('original')}</InfoTitle>
                <InfoList>
                  <InfoRow>
                    <InfoLabel>{t('dim')}</InfoLabel>
                    <InfoValue>
                      {imageInfo.originalWidth}x{imageInfo.originalHeight}
                    </InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>{t('size')}</InfoLabel>
                    <InfoValue>
                      {formatFileSize(imageInfo.size)}
                    </InfoValue>
                  </InfoRow>
                </InfoList>
              </InfoBlock>

              {/* Processed Info */}
              {processedImage && (
                <InfoBlock>
                  <InfoTitle>{t('processed')}</InfoTitle>
                  <InfoList>
                    <InfoRow>
                      <InfoLabel>{t('dim')}</InfoLabel>
                      <InfoValue>
                        {processedImage.width}x{processedImage.height}
                      </InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>{t('size')}</InfoLabel>
                      <InfoValue>
                        {formatFileSize(processedImage.size)}
                      </InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>{t('saved')}</InfoLabel>
                      <SavedValue $positive={processedImage.size < imageInfo.size}>
                        {processedImage.size < imageInfo.size
                          ? `-${Math.round(((imageInfo.size - processedImage.size) / imageInfo.size) * 100)}%`
                          : `+${Math.round(((processedImage.size - imageInfo.size) / imageInfo.size) * 100)}%`}
                      </SavedValue>
                    </InfoRow>
                  </InfoList>
                </InfoBlock>
              )}
            </InfoGrid>
          </Card>
        </ControlsSection>

        {/* Preview Section */}
        <PreviewSection>
          <PreviewCard>
            <PreviewHeader>
              <PreviewTitle>
                {processedImage ? t('processed') : t('original')}
              </PreviewTitle>
              <PreviewInfo>
                {displayWidth}x{displayHeight} | {formatFileSize(displaySize)}
              </PreviewInfo>
            </PreviewHeader>
            <PreviewContainer>
              {isPreviewProcessing && (
                <ProcessingOverlay>
                  <ProcessingSpinner />
                  <ProcessingLabel>PROCESSING...</ProcessingLabel>
                </ProcessingOverlay>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <PreviewImage
                src={displayImage}
                alt={imageInfo.name}
              />
            </PreviewContainer>
            <FileName>
              {imageInfo.name}
            </FileName>
          </PreviewCard>
        </PreviewSection>
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
