'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import { saveAs } from 'file-saver';
import GifDropZone from '@/components/gif-to-webp/GifDropZone';
import ConversionControls from '@/components/gif-to-webp/ConversionControls';
import ComparisonPreview from '@/components/gif-to-webp/ComparisonPreview';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui';
import { convertGifToWebp } from '@/lib/gif-to-webp/convertGifToWebp';
import { DEFAULT_OPTIONS, MAX_GIF_SIZE, ConversionError } from '@/lib/gif-to-webp/types';
import type { GifToWebpOptions, ErrorCode } from '@/lib/gif-to-webp/types';

const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const Page = styled.div`
  min-height: 100vh;
  background: ${colors.bg};
  display: flex;
  flex-direction: column;
  font-family: var(--font-body);
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${colors.bgCard};
  border-bottom: 1px solid ${colors.border};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const HeaderInner = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  padding: 0.6rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

const HeaderTitle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;

  h1 {
    font-family: var(--font-heading);
    font-size: 1rem;
    margin: 0;
    color: ${colors.text};
  }
  p {
    font-family: var(--font-body);
    font-size: 0.75rem;
    margin: 0;
    color: ${colors.textMuted};
  }
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const BackLink = styled(Link)`
  font-family: var(--font-heading);
  font-size: 0.75rem;
  padding: 0.4rem 0.75rem;
  background: transparent;
  color: ${colors.textMuted};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  text-decoration: none;

  &:hover {
    border-color: ${colors.primary};
    color: ${colors.primary};
  }
`;

const Main = styled.main`
  flex: 1;
  padding: 2rem 1rem;
`;

const Container = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SplitLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 900px) {
    grid-template-columns: 320px 1fr;
    align-items: start;
  }
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ProgressBox = styled.div`
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  padding: 1rem 1.25rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.text};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ProgressTrack = styled.div`
  height: 8px;
  background: ${colors.border};
  border-radius: 999px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $ratio: number }>`
  height: 100%;
  width: ${({ $ratio }) => Math.round($ratio * 100)}%;
  background: ${colors.primary};
  transition: width 0.15s linear;
`;

const ErrorBox = styled.div`
  background: #fef2f2;
  border: 1px solid #ef4444;
  border-radius: 12px;
  padding: 1rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: #b91c1c;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

interface SourceState {
  file: File;
  url: string;
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
  const t = useTranslations('gifToWebp');
  const tCommon = useTranslations('common');

  const [source, setSource] = useState<SourceState | null>(null);
  const [output, setOutput] = useState<OutputState | null>(null);
  const [options, setOptions] = useState<GifToWebpOptions>(DEFAULT_OPTIONS);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [dropErrorKey, setDropErrorKey] = useState<string | null>(null);

  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cancelRef.current?.();
      if (source) URL.revokeObjectURL(source.url);
      if (output) URL.revokeObjectURL(output.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [source, output]);

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

  return (
    <Page>
      <Header>
        <HeaderInner>
          <HeaderTitle>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </HeaderTitle>
          <HeaderRight>
            <LanguageSwitcher />
            <BackLink href="/">{tCommon('back')}</BackLink>
          </HeaderRight>
        </HeaderInner>
      </Header>

      <Main>
        <Container>
          {!source && (
            <GifDropZone onFile={handleFile} disabled={busy} errorKey={dropErrorKey} />
          )}

          {source && (
            <SplitLayout>
              <ConversionControls
                value={options}
                onChange={setOptions}
                onConvert={handleConvert}
                busy={busy}
              />
              <RightColumn>
                <ComparisonPreview
                  originalUrl={source.url}
                  outputUrl={output?.url ?? null}
                  originalSize={source.file.size}
                  outputSize={output?.size ?? null}
                />
                {busy && (
                  <ProgressBox>
                    <span>{t('progressLabel', { percent: Math.round(progress * 100) })}</span>
                    <ProgressTrack>
                      <ProgressFill $ratio={progress} />
                    </ProgressTrack>
                  </ProgressBox>
                )}
                {errorKey && (
                  <ErrorBox>
                    <span>{t(errorKey)}</span>
                    <Button onClick={handleReset}>{t('retry')}</Button>
                  </ErrorBox>
                )}
                {output && !busy && !errorKey && (
                  <ActionRow>
                    <Button onClick={handleDownload}>{t('downloadWebp')}</Button>
                    <Button onClick={handleReset}>{t('convertAnother')}</Button>
                  </ActionRow>
                )}
              </RightColumn>
            </SplitLayout>
          )}
        </Container>
      </Main>
    </Page>
  );
}
