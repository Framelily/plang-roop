'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes, css } from 'styled-components';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/hooks/useDebounce';
import { processImage } from '@/lib/image/resize';
import { downloadImage } from '@/lib/image/download';
import { mayContainExif } from '@/lib/image/exif';
import { formatFileSize, getFormatFromMimeType } from '@/lib/utils';
import { getImageData, removeImageData, STORAGE_KEYS } from '@/lib/storage';
import type { ImageFormat, ProcessedImage } from '@/lib/types';

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
    box-shadow: 0 0 10px ${colors.primary}, 0 0 20px ${colors.primary}, 0 0 30px ${colors.primary};
  }
`;

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: ${colors.bg};
  font-family: var(--font-terminal);
  color: ${colors.text};
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
      rgba(0, 0, 0, 0.15),
      rgba(0, 0, 0, 0.15) 1px,
      transparent 1px,
      transparent 2px
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
      rgba(18, 16, 16, 0) 50%,
      rgba(0, 0, 0, 0.25) 50%
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
  z-index: 10;

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${colors.neonPink}, ${colors.neonCyan}, ${colors.neonGreen});
  }
`;

const HeaderContent = styled.div`
  max-width: 72rem;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.textMuted};
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-terminal);
  font-size: 18px;
  transition: all 0.2s;
  padding: 8px 12px;
  border: 2px solid transparent;

  &:hover {
    color: ${colors.neonCyan};
    border-color: ${colors.neonCyan};
    text-shadow: 0 0 10px ${colors.neonCyan};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Divider = styled.div`
  width: 2px;
  height: 24px;
  background-color: ${colors.border};

  @media (max-width: 640px) {
    display: none;
  }
`;

const Title = styled.h1`
  font-family: var(--font-pixel);
  font-size: 14px;
  color: ${colors.neonPink};
  text-shadow: 0 0 10px ${colors.neonPink};
  letter-spacing: 2px;

  @media (min-width: 640px) {
    font-size: 16px;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const PixelButton = styled.button<{ $variant?: 'primary' | 'outline'; $size?: 'sm' | 'md' }>`
  font-family: var(--font-pixel);
  font-size: ${props => props.$size === 'sm' ? '8px' : '10px'};
  padding: ${props => props.$size === 'sm' ? '8px 12px' : '12px 16px'};
  border: 4px solid;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;

  ${props => props.$variant === 'outline' ? css`
    background-color: transparent;
    border-color: ${colors.textMuted};
    color: ${colors.textMuted};

    &:hover:not(:disabled) {
      border-color: ${colors.neonCyan};
      color: ${colors.neonCyan};
      text-shadow: 0 0 10px ${colors.neonCyan};
      box-shadow: 0 0 10px ${colors.neonCyan};
    }
  ` : css`
    background-color: ${colors.primary};
    border-color: ${colors.neonPink};
    color: ${colors.text};

    &:hover:not(:disabled) {
      background-color: ${colors.neonPink};
      box-shadow: 0 0 20px ${colors.neonPink};
      text-shadow: 0 0 10px ${colors.text};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: translateY(2px);
  }

  &::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border: 2px solid transparent;
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
  position: relative;
  z-index: 10;

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
  border: 4px solid ${colors.border};
  padding: 16px;
  position: relative;

  @media (min-width: 640px) {
    padding: 20px;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${colors.neonGreen}, ${colors.neonCyan});
  }
`;

const SectionTitle = styled.h3`
  font-family: var(--font-pixel);
  font-size: 10px;
  color: ${colors.neonGreen};
  margin-bottom: 16px;
  text-shadow: 0 0 5px ${colors.neonGreen};
`;

const SectionDivider = styled.div`
  height: 2px;
  background: linear-gradient(90deg, transparent, ${colors.border}, transparent);
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
  gap: 8px;
`;

const InputLabel = styled.label`
  font-family: var(--font-terminal);
  font-size: 16px;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const InputContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: ${colors.bg};
  border: 3px solid ${colors.border};
  transition: all 0.2s;

  &:focus-within {
    border-color: ${colors.neonCyan};
    box-shadow: 0 0 10px ${colors.neonCyan};
  }
`;

const StyledInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px 12px;
  font-family: var(--font-terminal);
  font-size: 20px;
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
  font-family: var(--font-terminal);
  font-size: 16px;
  color: ${colors.textMuted};
  background-color: ${colors.bgLight};
  height: 100%;
  display: flex;
  align-items: center;
`;

const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px 0;

  &:hover span {
    border-color: ${colors.neonCyan};
  }
`;

const CheckboxInput = styled.input`
  display: none;

  &:checked + span {
    background-color: ${colors.primary};
    border-color: ${colors.neonPink};

    &::after {
      content: 'X';
      display: block;
      color: ${colors.text};
      font-family: var(--font-pixel);
      font-size: 10px;
      text-align: center;
      line-height: 18px;
    }
  }
`;

const CheckboxBox = styled.span`
  width: 24px;
  height: 24px;
  border: 3px solid ${colors.border};
  background-color: ${colors.bg};
  transition: all 0.2s;
`;

const CheckboxLabel = styled.span`
  font-family: var(--font-terminal);
  font-size: 18px;
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
  padding: 10px 16px;
  border: 3px solid ${props => props.$checked ? colors.neonPink : colors.border};
  background-color: ${props => props.$checked ? colors.primary : colors.bg};
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-pixel);
  font-size: 8px;
  color: ${props => props.$checked ? colors.text : colors.textMuted};
  text-transform: uppercase;

  ${props => props.$checked && css`
    box-shadow: 0 0 10px ${colors.neonPink};
    text-shadow: 0 0 5px ${colors.text};
  `}

  &:hover {
    border-color: ${colors.neonCyan};
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
  height: 8px;
  background: ${colors.bg};
  border: 2px solid ${colors.border};
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    background: ${colors.neonGreen};
    border: 3px solid ${colors.bgLight};
    cursor: pointer;
    box-shadow: 0 0 10px ${colors.neonGreen};
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: ${colors.neonGreen};
    border: 3px solid ${colors.bgLight};
    cursor: pointer;
    box-shadow: 0 0 10px ${colors.neonGreen};
  }
`;

const SliderValue = styled.span`
  font-family: var(--font-pixel);
  font-size: 10px;
  color: ${colors.neonYellow};
  min-width: 40px;
  text-align: right;
  text-shadow: 0 0 5px ${colors.neonYellow};
`;

const HelpText = styled.p`
  font-family: var(--font-terminal);
  font-size: 14px;
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
  font-family: var(--font-pixel);
  font-size: 8px;
  color: ${colors.neonCyan};
  margin-bottom: 12px;
  text-shadow: 0 0 5px ${colors.neonCyan};

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
  font-family: var(--font-terminal);
  font-size: 16px;
  color: ${colors.textMuted};
`;

const InfoValue = styled.dd`
  font-family: var(--font-terminal);
  font-size: 16px;
  color: ${colors.text};
`;

const SavedValue = styled.dd<{ $positive: boolean }>`
  font-family: var(--font-pixel);
  font-size: 10px;
  color: ${props => props.$positive ? colors.neonGreen : colors.neonPink};
  text-shadow: 0 0 5px ${props => props.$positive ? colors.neonGreen : colors.neonPink};
`;

const PreviewSection = styled.div`
  flex: 1;

  @media (min-width: 1024px) {
    order: 1;
  }
`;

const PreviewCard = styled(Card)`
  &::before {
    background: linear-gradient(90deg, ${colors.neonPink}, ${colors.primary});
  }
`;

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
  font-family: var(--font-pixel);
  font-size: 10px;
  color: ${colors.neonPink};
  text-shadow: 0 0 5px ${colors.neonPink};
`;

const PreviewInfo = styled.span`
  font-family: var(--font-terminal);
  font-size: 14px;
  color: ${colors.textMuted};

  @media (min-width: 640px) {
    font-size: 16px;
  }
`;

const PreviewContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${colors.bg};
  border: 3px solid ${colors.border};
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
  image-rendering: pixelated;

  @media (min-width: 640px) {
    max-height: 400px;
  }

  @media (min-width: 1024px) {
    max-height: 500px;
  }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
  background-color: rgba(15, 15, 35, 0.75);
  z-index: 10;
  gap: 12px;
`;

const ProcessingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid ${colors.border};
  border-top: 4px solid ${colors.neonCyan};
  animation: ${spin} 0.8s linear infinite;
`;

const ProcessingLabel = styled.span`
  font-family: var(--font-pixel);
  font-size: 10px;
  color: ${colors.neonCyan};
  text-shadow: 0 0 10px ${colors.neonCyan};
  letter-spacing: 2px;
`;

const FileName = styled.p`
  font-family: var(--font-terminal);
  font-size: 14px;
  color: ${colors.textMuted};
  margin-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (min-width: 640px) {
    font-size: 16px;
    margin-top: 12px;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background-color: ${colors.bg};
`;

const LoadingText = styled.div`
  font-family: var(--font-pixel);
  font-size: 12px;
  color: ${colors.neonCyan};
  text-shadow: 0 0 10px ${colors.neonCyan};
  animation: ${blink} 1s infinite;
`;

const BlinkingCursor = styled.span`
  animation: ${blink} 0.7s infinite;
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
  }, [imageDataUrl, imageInfo, isLoading, debouncedWidth, debouncedHeight, debouncedFormat, debouncedQuality, keepAspectRatio]);

  // Download the already-processed image
  const handleDownload = useCallback(() => {
    if (!processedImage || !imageInfo) return;
    downloadImage(processedImage.blob, imageInfo.name, format);
  }, [processedImage, imageInfo, format]);

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
        <LoadingText>{tc('loading')}<BlinkingCursor>_</BlinkingCursor></LoadingText>
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
      <Header>
        <HeaderContent>
          <HeaderLeft>
            <BackButton onClick={handleBack}>
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
            <PixelButton $variant="outline" $size="sm" onClick={handleReset}>
              {tc('reset')}
            </PixelButton>
            <PixelButton $size="sm" onClick={handleDownload} disabled={!processedImage || isPreviewProcessing}>
              {isPreviewProcessing ? '...' : tc('download')}
            </PixelButton>
          </HeaderRight>
        </HeaderContent>
      </Header>

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
    </PageContainer>
  );
}
