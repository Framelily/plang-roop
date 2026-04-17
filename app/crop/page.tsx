'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import DropZone from '@/components/DropZone';
import PageHeader from '@/components/PageHeader';
import AspectRatioPicker, { type AspectPreset } from '@/components/crop/AspectRatioPicker';
import CropDimensions from '@/components/crop/CropDimensions';
import CropCanvas from '@/components/crop/CropCanvas';
import {
  PageMain,
  PreviewArea,
  SidePanel,
  SectionCard,
  PageActions,
  ActionButton,
  Pills,
  Pill,
  Spinner,
} from '@/components/layout';
import { cropAndTransform } from '@/lib/image/crop';
import { downloadImage } from '@/lib/image/download';
import {
  getImageData,
  removeImageData,
  storeImageData,
  STORAGE_KEYS,
} from '@/lib/storage';
import { getFormatFromMimeType } from '@/lib/utils';
import type { CropRect, ImageFormat } from '@/lib/types';

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

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${colors.bg};
  font-family: var(--font-body);
  color: ${colors.text};
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

const ErrorBox = styled.div`
  padding: 12px;
  background: #fef2f2;
  color: ${colors.error};
  border-radius: 12px;
  font-size: 0.8125rem;
`;

const EmptyState = styled.div`
  max-width: 72rem;
  width: 100%;
  margin: 2rem auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  const tc = useTranslations('common');

  const [loaded, setLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<CropMetadata | null>(null);

  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspectId, setAspectId] = useState<string>('free');
  const [aspect, setAspect] = useState<number | null>(null);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [quality, setQuality] = useState(0.9);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialDimsRef = useRef<{ w: number; h: number } | null>(null);

  const workingDims = meta
    ? { w: meta.originalWidth, h: meta.originalHeight }
    : { w: 0, h: 0 };

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

  const handleDrop = useCallback(async (file: File) => {
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
      setAspectId('free');
      setAspect(null);
      if (file.type) setFormat(getFormatFromMimeType(file.type));
    } catch (err) {
      console.error(err);
      setError(t('errorLoad'));
    }
  }, [t]);

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
      const result = await cropAndTransform(imageUrl, {
        crop,
        transform: { rotate: 0, flipH: false, flipV: false },
        format,
        quality,
      });
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
        <PageHeader title={t('backTitle')} onBack={() => router.push('/')} />
        <EmptyState>
          <DropZone onFileSelect={handleDrop} />
          {error && <ErrorBox>{error}</ErrorBox>}
        </EmptyState>
      </PageContainer>
    );
  }

  const invalid = crop.width <= 0 || crop.height <= 0;
  const originalRatio = workingDims.w / workingDims.h;

  return (
    <PageContainer>
      <PageHeader
        title={t('backTitle')}
        subtitle={meta.name}
        onBack={handleBack}
      />

      <PageMain>
        <PreviewArea>
          <CropCanvas
            imageUrl={imageUrl}
            imageWidth={workingDims.w}
            imageHeight={workingDims.h}
            crop={crop}
            aspect={aspect}
            onCropChange={(r) => setCrop(r)}
          />
        </PreviewArea>

        <SidePanel>
          <SectionCard>
            <AspectRatioPicker value={aspectId} onChange={handleAspect} originalRatio={originalRatio} />
          </SectionCard>

          <SectionCard>
            <CropDimensions
              crop={crop}
              maxWidth={workingDims.w}
              maxHeight={workingDims.h}
              onChange={(r) => setCrop(r)}
            />
          </SectionCard>

          <SectionCard title={t('format')}>
            <Pills>
              {(['jpeg', 'png', 'webp'] as const).map((f) => (
                <Pill key={f} type="button" $active={format === f} onClick={() => setFormat(f)}>
                  {f === 'jpeg' ? 'JPG' : f.toUpperCase()}
                </Pill>
              ))}
            </Pills>
          </SectionCard>

          <SectionCard title={t('quality')}>
            <QualityRow>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                disabled={format === 'png'}
                style={{ width: '100%' }}
              />
              <QualityValue>{Math.round(quality * 100)}%</QualityValue>
            </QualityRow>
          </SectionCard>

          {error && <ErrorBox>{error}</ErrorBox>}

          <PageActions>
            <ActionButton $variant="outline" onClick={handleReset}>
              {tc('reset')}
            </ActionButton>
            <ActionButton
              $variant="primary"
              onClick={handleDownload}
              disabled={processing || invalid}
            >
              {processing ? (
                <>
                  <Spinner />
                  {tc('processing')}
                </>
              ) : (
                tc('download')
              )}
            </ActionButton>
          </PageActions>
        </SidePanel>
      </PageMain>
    </PageContainer>
  );
}
