'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import { useTranslations } from 'next-intl';
import DropZone from '@/components/DropZone';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import TransformToolbar from '@/components/crop/TransformToolbar';
import AspectRatioPicker, { type AspectPreset } from '@/components/crop/AspectRatioPicker';
import CropDimensions from '@/components/crop/CropDimensions';
import CropCanvas from '@/components/crop/CropCanvas';
import { cropAndTransform } from '@/lib/image/crop';
import { downloadImage } from '@/lib/image/download';
import {
  getImageData,
  removeImageData,
  storeImageData,
  STORAGE_KEYS,
} from '@/lib/storage';
import { getFormatFromMimeType } from '@/lib/utils';
import type { CropRect, ImageFormat, Transform } from '@/lib/types';

const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  success: '#22C55E',
  error: '#EF4444',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${colors.bg};
  font-family: var(--font-body);
  color: ${colors.text};
`;

const HeaderWrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 12px 12px 0;
  @media (min-width: 640px) {
    padding: 16px 16px 0;
  }
`;

const Header = styled.header`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  max-width: 72rem;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const BackBtn = styled.button`
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  background: ${colors.primaryLight};
  color: ${colors.primary};
  border: none;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-body);
`;

const Title = styled.h1`
  font-family: var(--font-heading);
  font-size: 1rem;
  margin: 0;
  color: ${colors.text};
`;

const FileName = styled.span`
  font-size: 0.8rem;
  color: ${colors.textMuted};
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Main = styled.main`
  flex: 1;
  max-width: 72rem;
  width: 100%;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 340px;
    align-items: start;
  }
`;

const SidePanel = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Card = styled.section`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const SectionLabel = styled.div`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  color: ${colors.textMuted};
  margin-bottom: 0.75rem;
`;

const FormatRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const FormatBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  height: 36px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? colors.primary : colors.border)};
  background: ${({ $active }) => ($active ? colors.primary : colors.bgCard)};
  color: ${({ $active }) => ($active ? '#fff' : colors.text)};
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
`;

const Slider = styled.input`
  width: 100%;
`;

const QualityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const QualityValue = styled.span`
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: ${colors.textMuted};
  min-width: 36px;
  text-align: right;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ResetBtn = styled.button`
  flex: 1;
  height: 44px;
  border-radius: 12px;
  border: 1px solid ${colors.border};
  background: ${colors.bgCard};
  color: ${colors.text};
  font-family: var(--font-body);
  font-weight: 700;
  cursor: pointer;
`;

const DownloadBtn = styled.button`
  flex: 2;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: ${colors.primary};
  color: #ffffff;
  font-family: var(--font-body);
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const ErrorBox = styled.div`
  padding: 12px;
  background: #fef2f2;
  color: ${colors.error};
  border-radius: 12px;
  font-size: 0.8125rem;
`;

const EmptyState = styled.div`
  max-width: 36rem;
  margin: 3rem auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
`;

interface CropMetadata {
  name: string;
  originalWidth: number;
  originalHeight: number;
  type: string;
}

export default function CropPage() {
  const router = useRouter();
  const t = useTranslations('crop');

  const [loaded, setLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<CropMetadata | null>(null);

  const [transform, setTransform] = useState<Transform>({ rotate: 0, flipH: false, flipV: false });
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspectId, setAspectId] = useState<string>('free');
  const [aspect, setAspect] = useState<number | null>(null);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [quality, setQuality] = useState(0.9);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialDimsRef = useRef<{ w: number; h: number } | null>(null);

  const workingDims = (() => {
    if (!meta) return { w: 0, h: 0 };
    const rotated = transform.rotate === 90 || transform.rotate === 270;
    return rotated
      ? { w: meta.originalHeight, h: meta.originalWidth }
      : { w: meta.originalWidth, h: meta.originalHeight };
  })();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getImageData(STORAGE_KEYS.CROP_IMAGE);
        const metaStr = await getImageData(STORAGE_KEYS.CROP_METADATA);
        if (cancelled) return;
        if (data && metaStr) {
          const parsed: CropMetadata = JSON.parse(metaStr);
          setImageUrl(data);
          setMeta(parsed);
          const full = { x: 0, y: 0, width: parsed.originalWidth, height: parsed.originalHeight };
          setCrop(full);
          initialDimsRef.current = { w: parsed.originalWidth, h: parsed.originalHeight };
          if (parsed.type) setFormat(getFormatFromMimeType(parsed.type));
        }
      } catch (err) {
        console.error('Failed to load crop image', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setError(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read-fail'));
        reader.readAsDataURL(file);
      });

      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new globalThis.Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error('img-fail'));
        img.src = dataUrl;
      });

      const m: CropMetadata = {
        name: file.name,
        originalWidth: dims.w,
        originalHeight: dims.h,
        type: file.type,
      };
      await storeImageData(STORAGE_KEYS.CROP_IMAGE, dataUrl);
      await storeImageData(STORAGE_KEYS.CROP_METADATA, JSON.stringify(m));

      setImageUrl(dataUrl);
      setMeta(m);
      setCrop({ x: 0, y: 0, width: dims.w, height: dims.h });
      initialDimsRef.current = { w: dims.w, h: dims.h };
      setTransform({ rotate: 0, flipH: false, flipV: false });
      setAspectId('free');
      setAspect(null);
      if (file.type) setFormat(getFormatFromMimeType(file.type));
    } catch (err) {
      console.error(err);
      setError(t('errorLoad'));
    }
  }, [t]);

  const handleTransformChange = (next: Transform) => {
    const rotationChanged = next.rotate !== transform.rotate;
    setTransform(next);
    if (rotationChanged && meta) {
      const rotated = next.rotate === 90 || next.rotate === 270;
      const w = rotated ? meta.originalHeight : meta.originalWidth;
      const h = rotated ? meta.originalWidth : meta.originalHeight;
      setCrop({ x: 0, y: 0, width: w, height: h });
    }
  };

  const handleAspect = (preset: AspectPreset) => {
    setAspectId(preset.id);
    setAspect(preset.ratio);
    if (preset.ratio && workingDims.w > 0) {
      const maxW = workingDims.w;
      const maxH = workingDims.h;
      let w = maxW;
      let h = maxW / preset.ratio;
      if (h > maxH) {
        h = maxH;
        w = maxH * preset.ratio;
      }
      setCrop({
        x: Math.round((maxW - w) / 2),
        y: Math.round((maxH - h) / 2),
        width: Math.round(w),
        height: Math.round(h),
      });
    }
  };

  const handleReset = () => {
    setTransform({ rotate: 0, flipH: false, flipV: false });
    if (initialDimsRef.current) {
      setCrop({ x: 0, y: 0, width: initialDimsRef.current.w, height: initialDimsRef.current.h });
    }
    setAspectId('free');
    setAspect(null);
    setFormat('jpeg');
    setQuality(0.9);
  };

  const handleDownload = async () => {
    if (!imageUrl || !meta) return;
    if (crop.width <= 0 || crop.height <= 0) {
      setError(t('invalidCrop'));
      return;
    }
    setError(null);
    setProcessing(true);
    try {
      const result = await cropAndTransform(imageUrl, { crop, transform, format, quality });
      downloadImage(result.blob, meta.name, format);
      URL.revokeObjectURL(result.url);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error && err.message === 'invalidCrop' ? 'invalidCrop' : 'errorProcess';
      setError(t(msg));
    } finally {
      setProcessing(false);
    }
  };

  const handleBack = async () => {
    await removeImageData(STORAGE_KEYS.CROP_IMAGE);
    await removeImageData(STORAGE_KEYS.CROP_METADATA);
    router.push('/');
  };

  if (!loaded) return null;

  if (!imageUrl || !meta) {
    return (
      <PageContainer>
        <HeaderWrap>
          <Header>
            <HeaderLeft>
              <BackBtn type="button" onClick={() => router.push('/')}>← {t('backToUpload')}</BackBtn>
              <Title>{t('backTitle')}</Title>
            </HeaderLeft>
            <LanguageSwitcher />
          </Header>
        </HeaderWrap>
        <EmptyState>
          <DropZone onFilesSelect={handleDrop} />
          {error && <ErrorBox>{error}</ErrorBox>}
        </EmptyState>
      </PageContainer>
    );
  }

  const invalid = crop.width <= 0 || crop.height <= 0;
  const originalRatio = workingDims.w / workingDims.h;

  return (
    <PageContainer>
      <HeaderWrap>
        <Header>
          <HeaderLeft>
            <BackBtn type="button" onClick={handleBack} aria-label={t('backToUpload')}>←</BackBtn>
            <Title>{t('backTitle')}</Title>
            <FileName title={meta.name}>{meta.name}</FileName>
          </HeaderLeft>
          <LanguageSwitcher />
        </Header>
      </HeaderWrap>

      <Main>
        <CropCanvas
          imageUrl={imageUrl}
          imageWidth={workingDims.w}
          imageHeight={workingDims.h}
          crop={crop}
          aspect={aspect}
          onCropChange={(r) => setCrop(r)}
        />

        <SidePanel>
          <Card>
            <TransformToolbar value={transform} onChange={handleTransformChange} />
          </Card>

          <Card>
            <AspectRatioPicker value={aspectId} onChange={handleAspect} originalRatio={originalRatio} />
          </Card>

          <Card>
            <CropDimensions
              crop={crop}
              maxWidth={workingDims.w}
              maxHeight={workingDims.h}
              onChange={(r) => setCrop(r)}
            />
          </Card>

          <Card>
            <SectionLabel>{t('format')}</SectionLabel>
            <FormatRow>
              {(['jpeg', 'png', 'webp'] as const).map((f) => (
                <FormatBtn
                  key={f}
                  type="button"
                  $active={format === f}
                  onClick={() => setFormat(f)}
                >
                  {f === 'jpeg' ? 'JPG' : f.toUpperCase()}
                </FormatBtn>
              ))}
            </FormatRow>
          </Card>

          <Card>
            <SectionLabel>{t('quality')}</SectionLabel>
            <QualityRow>
              <Slider
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                disabled={format === 'png'}
              />
              <QualityValue>{Math.round(quality * 100)}%</QualityValue>
            </QualityRow>
          </Card>

          {error && <ErrorBox>{error}</ErrorBox>}

          <Actions>
            <ResetBtn type="button" onClick={handleReset}>
              {t('reset')}
            </ResetBtn>
            <DownloadBtn type="button" onClick={handleDownload} disabled={processing || invalid}>
              {processing ? (
                <>
                  <Spinner />
                  {t('processing')}
                </>
              ) : (
                t('download')
              )}
            </DownloadBtn>
          </Actions>
        </SidePanel>
      </Main>
    </PageContainer>
  );
}
