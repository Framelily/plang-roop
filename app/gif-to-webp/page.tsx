'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import { useTranslations } from 'next-intl';
import { saveAs } from 'file-saver';
import PageHeader from '@/components/PageHeader';
import GifDropZone from '@/components/gif-to-webp/GifDropZone';
import {
  PageMain,
  PreviewArea,
  SidePanel,
  SectionCard,
  PageActions,
  ActionButton,
  Spinner,
} from '@/components/layout';
import Slider from '@/components/ui/Slider';
import Checkbox from '@/components/ui/Checkbox';
import { convertGifToWebp } from '@/lib/gif-to-webp/convertGifToWebp';
import { DEFAULT_OPTIONS, MAX_GIF_SIZE, ConversionError } from '@/lib/gif-to-webp/types';
import type { GifToWebpOptions, ErrorCode } from '@/lib/gif-to-webp/types';
import { formatFileSize } from '@/lib/utils';

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

const EmptyState = styled.div`
  max-width: 72rem;
  width: 100%;
  margin: 2rem auto;
  padding: 0 16px;
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
  font-family: var(--font-heading);
  font-size: 0.875rem;
  color: ${colors.text};
  font-weight: 700;
  margin: 0;
`;

const PreviewInfo = styled.span`
  font-family: var(--font-body);
  font-size: 0.813rem;
  color: ${colors.textMuted};

  @media (min-width: 640px) {
    font-size: 0.875rem;
  }
`;

const ComparisonGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PanelLabel = styled.div`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  min-height: 250px;

  @media (min-width: 640px) {
    padding: 16px;
    min-height: 300px;
  }

  @media (min-width: 1024px) {
    min-height: 360px;
  }
`;

const PreviewImage = styled.img`
  max-height: 240px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 8px;

  @media (min-width: 640px) {
    max-height: 320px;
  }

  @media (min-width: 1024px) {
    max-height: 420px;
  }
`;

const EmptyPlaceholder = styled.span`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.textMuted};
  text-align: center;
`;

const ProcessingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(248, 250, 252, 0.8);
  border-radius: 12px;
  z-index: 10;
  gap: 8px;
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

const ProcessingPercent = styled.span`
  font-family: var(--font-heading);
  font-size: 1rem;
  color: ${colors.primary};
  font-weight: 700;
`;

const HelpText = styled.p`
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: ${colors.textMuted};
  margin: 8px 0 0;
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InfoList = styled.dl`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
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
  margin: 0;
`;

const InfoValue = styled.dd`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.text};
  font-weight: 500;
  margin: 0;
`;

const SavedValue = styled.dd<{ $positive: boolean }>`
  font-family: var(--font-heading);
  font-size: 0.813rem;
  font-weight: 600;
  color: ${(props) => (props.$positive ? colors.success : colors.error)};
  margin: 0;
`;

const InfoDivider = styled.div`
  height: 1px;
  background: ${colors.border};
  margin: 8px 0;
`;

const ErrorBox = styled.div`
  padding: 12px;
  background: #fef2f2;
  color: ${colors.error};
  border-radius: 12px;
  font-size: 0.8125rem;
`;

const SuccessOverlay = styled.div`
  position: fixed;
  inset: 0;
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
  margin: 0;
`;

const SuccessCountdown = styled.p`
  font-family: var(--font-body);
  font-size: 0.938rem;
  color: ${colors.textMuted};
  margin: 0;
`;

interface SourceState {
  file: File;
  url: string;
  originalWidth?: number;
  originalHeight?: number;
}

interface OutputState {
  blob: Blob;
  url: string;
  size: number;
}

const ERROR_KEY: Record<ErrorCode, string> = {
  load_encoder: 'errorLoadEncoder',
  convert_failed: 'errorConvertFailed',
  not_animated: 'errorNotAnimated',
  invalid_gif: 'errorInvalidGif',
};

function deriveOutputName(input: string): string {
  const dot = input.lastIndexOf('.');
  const base = dot > 0 ? input.slice(0, dot) : input;
  return `${base}.webp`;
}

export default function GifToWebpPage() {
  const router = useRouter();
  const t = useTranslations('gifToWebp');
  const tc = useTranslations('common');

  const [source, setSource] = useState<SourceState | null>(null);
  const [output, setOutput] = useState<OutputState | null>(null);
  const [options, setOptions] = useState<GifToWebpOptions>(DEFAULT_OPTIONS);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [dropErrorKey, setDropErrorKey] = useState<string | null>(null);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cancelRef.current?.();
      if (source) URL.revokeObjectURL(source.url);
      if (output) URL.revokeObjectURL(output.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!downloadComplete) return;
    if (countdown <= 0) {
      if (source) URL.revokeObjectURL(source.url);
      if (output) URL.revokeObjectURL(output.url);
      router.push('/');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [downloadComplete, countdown, router, source, output]);

  const handleFile = useCallback(
    (file: File) => {
      setDropErrorKey(null);
      if (file.type !== 'image/gif' && !file.name.toLowerCase().endsWith('.gif')) {
        setDropErrorKey('invalidFormat');
        return;
      }
      if (file.size > MAX_GIF_SIZE) {
        setDropErrorKey('fileTooLarge');
        return;
      }
      if (source) URL.revokeObjectURL(source.url);
      if (output) URL.revokeObjectURL(output.url);
      setOutput(null);
      setProgress(0);
      setErrorKey(null);
      setSource({ file, url: URL.createObjectURL(file) });
    },
    [source, output],
  );

  const handleSourceLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setSource((prev) => {
        if (!prev || prev.originalWidth) return prev;
        return { ...prev, originalWidth: img.naturalWidth, originalHeight: img.naturalHeight };
      });
    },
    [],
  );

  const handleConvert = useCallback(() => {
    if (!source) return;
    setBusy(true);
    setErrorKey(null);
    setProgress(0);
    if (output) {
      URL.revokeObjectURL(output.url);
      setOutput(null);
    }

    const handle = convertGifToWebp(source.file, options, {
      onProgress: (ratio) => setProgress(ratio),
    });
    cancelRef.current = handle.cancel;

    handle.result
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setOutput({ blob, url, size: blob.size });
        setProgress(1);
      })
      .catch((err) => {
        if (err instanceof ConversionError) {
          setErrorKey(ERROR_KEY[err.code]);
        } else {
          setErrorKey('errorConvertFailed');
        }
      })
      .finally(() => {
        setBusy(false);
        cancelRef.current = null;
      });
  }, [source, options, output]);

  const handleDownload = useCallback(() => {
    if (!source || !output) return;
    saveAs(output.blob, deriveOutputName(source.file.name));
    setDownloadComplete(true);
    setCountdown(3);
  }, [source, output]);

  const handleRetry = useCallback(() => {
    setErrorKey(null);
    setProgress(0);
    if (output) {
      URL.revokeObjectURL(output.url);
      setOutput(null);
    }
  }, [output]);

  const handleReset = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    if (source) URL.revokeObjectURL(source.url);
    if (output) URL.revokeObjectURL(output.url);
    setSource(null);
    setOutput(null);
    setOptions(DEFAULT_OPTIONS);
    setProgress(0);
    setBusy(false);
    setErrorKey(null);
    setDropErrorKey(null);
  }, [source, output]);

  const handleBack = useCallback(() => {
    cancelRef.current?.();
    if (source) URL.revokeObjectURL(source.url);
    if (output) URL.revokeObjectURL(output.url);
    router.push('/');
  }, [router, source, output]);

  if (!source) {
    return (
      <PageContainer>
        <PageHeader title={t('title')} onBack={() => router.push('/')} />
        <EmptyState>
          <GifDropZone
            onFile={handleFile}
            onReject={(key) => setDropErrorKey(key)}
            disabled={busy}
            errorKey={dropErrorKey}
          />
        </EmptyState>
      </PageContainer>
    );
  }

  const savingsPct =
    output && source.file.size > 0
      ? Math.round(((source.file.size - output.size) / source.file.size) * 100)
      : null;

  const previewTitle = output ? t('comparisonLabel') : t('originalLabel');
  const dimText =
    source.originalWidth && source.originalHeight
      ? `${source.originalWidth}x${source.originalHeight}`
      : '—';
  const sizeSummary = output
    ? `${dimText} | ${formatFileSize(source.file.size)} → ${formatFileSize(output.size)}${
        savingsPct !== null ? ` (${savingsPct > 0 ? '−' : '+'}${Math.abs(savingsPct)}%)` : ''
      }`
    : `${dimText} | ${formatFileSize(source.file.size)}`;

  let primaryLabel: string = t('convert');
  let primaryDisabled = false;
  let primaryAction: (() => void) = handleConvert;
  if (errorKey) {
    primaryLabel = t('retry');
    primaryAction = handleRetry;
  } else if (busy) {
    primaryDisabled = true;
  } else if (output) {
    primaryLabel = tc('download');
    primaryAction = handleDownload;
  }

  return (
    <PageContainer>
      <PageHeader title={t('title')} subtitle={source.file.name} onBack={handleBack} />

      <PageMain>
        <PreviewArea>
          <SectionCard>
            <PreviewHeader>
              <PreviewTitle>{previewTitle}</PreviewTitle>
              <PreviewInfo>{sizeSummary}</PreviewInfo>
            </PreviewHeader>
            <ComparisonGrid>
              <Panel>
                <PanelLabel>{t('originalLabel')}</PanelLabel>
                <PreviewContainer>
                  <PreviewImage
                    src={source.url}
                    alt={t('originalLabel')}
                    onLoad={handleSourceLoad}
                  />
                </PreviewContainer>
              </Panel>
              <Panel>
                <PanelLabel>{t('convertedLabel')}</PanelLabel>
                <PreviewContainer>
                  {output ? (
                    <PreviewImage src={output.url} alt={t('convertedLabel')} />
                  ) : (
                    !busy && <EmptyPlaceholder>{t('emptyPreview')}</EmptyPlaceholder>
                  )}
                  {busy && (
                    <ProcessingOverlay>
                      <ProcessingSpinner />
                      <ProcessingLabel>{t('encoding')}</ProcessingLabel>
                      <ProcessingPercent>
                        {progress > 0 ? `${Math.round(progress * 100)}%` : '…'}
                      </ProcessingPercent>
                    </ProcessingOverlay>
                  )}
                </PreviewContainer>
              </Panel>
            </ComparisonGrid>
          </SectionCard>
        </PreviewArea>

        <SidePanel>
          <SectionCard title={t('quality')}>
            <Slider
              id="gif-quality"
              min={1}
              max={100}
              step={1}
              value={options.quality}
              disabled={options.lossless || busy}
              onChange={(e) => setOptions({ ...options, quality: Number(e.target.value) })}
            />
            <HelpText>{t('qualityHint')}</HelpText>
          </SectionCard>

          <SectionCard title={t('options')}>
            <CheckboxGroup>
              <Checkbox
                id="gif-lossless"
                label={t('lossless')}
                checked={options.lossless}
                disabled={busy}
                onChange={(e) => setOptions({ ...options, lossless: e.target.checked })}
              />
              <HelpText>{t('losslessHint')}</HelpText>
              <Checkbox
                id="gif-loop"
                label={t('loopInfinite')}
                checked={options.loopInfinite}
                disabled={busy}
                onChange={(e) => setOptions({ ...options, loopInfinite: e.target.checked })}
              />
              <HelpText>{t('loopHint')}</HelpText>
            </CheckboxGroup>
          </SectionCard>

          <SectionCard>
            <InfoList>
              <InfoRow>
                <InfoLabel>{t('dim')}</InfoLabel>
                <InfoValue>{dimText}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>{t('size')}</InfoLabel>
                <InfoValue>{formatFileSize(source.file.size)}</InfoValue>
              </InfoRow>
              {output && (
                <>
                  <InfoDivider />
                  <InfoRow>
                    <InfoLabel>{t('convertedLabel')}</InfoLabel>
                    <InfoValue>{formatFileSize(output.size)}</InfoValue>
                  </InfoRow>
                  {savingsPct !== null && (
                    <InfoRow>
                      <InfoLabel>{t('saved')}</InfoLabel>
                      <SavedValue $positive={savingsPct >= 0}>
                        {savingsPct >= 0 ? `-${savingsPct}%` : `+${Math.abs(savingsPct)}%`}
                      </SavedValue>
                    </InfoRow>
                  )}
                </>
              )}
            </InfoList>
          </SectionCard>

          {errorKey && <ErrorBox>{t(errorKey)}</ErrorBox>}

          <PageActions>
            <ActionButton $variant="outline" onClick={handleReset} disabled={busy}>
              {tc('reset')}
            </ActionButton>
            <ActionButton
              $variant="primary"
              onClick={primaryAction}
              disabled={primaryDisabled}
            >
              {busy ? (
                <>
                  <Spinner />
                  {t('encoding')}
                </>
              ) : (
                primaryLabel
              )}
            </ActionButton>
          </PageActions>
        </SidePanel>
      </PageMain>

      {downloadComplete && (
        <SuccessOverlay>
          <SuccessIcon>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
