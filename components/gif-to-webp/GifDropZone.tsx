'use client';

import { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import { MAX_GIF_SIZE } from '@/lib/gif-to-webp/types';

const colors = {
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#CBD5E1',
  error: '#EF4444',
};

const Container = styled.div<{ $active: boolean; $reject: boolean; $disabled: boolean }>`
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: ${({ $active }) => ($active ? colors.primaryLight : colors.bgCard)};
  border: 2px dashed
    ${({ $active, $reject }) =>
      $reject ? colors.error : $active ? colors.primary : colors.border};
  border-radius: 16px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &:hover {
    border-color: ${colors.primary};
    background: ${colors.primaryLight};
  }
`;

const IconWrap = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.primaryLight};
  border-radius: 50%;
  margin-bottom: 1rem;
`;

const Icon = styled.svg`
  width: 32px;
  height: 32px;
  color: ${colors.primary};
`;

const Title = styled.p`
  font-family: var(--font-heading);
  font-size: 1rem;
  color: ${colors.text};
  text-align: center;
  margin: 0 0 0.5rem;
`;

const Hint = styled.p`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.textMuted};
  text-align: center;
  margin: 0;
`;

const ErrorText = styled.p`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.error};
  text-align: center;
  margin: 0.75rem 0 0;
`;

interface GifDropZoneProps {
  onFile: (file: File) => void;
  onReject?: (errorKey: 'invalidFormat' | 'fileTooLarge') => void;
  disabled?: boolean;
  errorKey?: string | null;
}

export default function GifDropZone({
  onFile,
  onReject,
  disabled = false,
  errorKey,
}: GifDropZoneProps) {
  const t = useTranslations('gifToWebp');

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (accepted.length > 0) {
        onFile(accepted[0]);
        return;
      }
      if (rejections.length > 0 && onReject) {
        const errors = rejections[0].errors;
        const tooLarge = errors.some((e) => e.code === 'file-too-large');
        onReject(tooLarge ? 'fileTooLarge' : 'invalidFormat');
      }
    },
    [onFile, onReject],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'image/gif': ['.gif'] },
    maxSize: MAX_GIF_SIZE,
    multiple: false,
    disabled,
  });

  return (
    <>
      <Container
        {...getRootProps()}
        $active={isDragActive}
        $reject={isDragReject}
        $disabled={disabled}
      >
        <input {...getInputProps()} />
        <IconWrap>
          <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 12h2v4M11 12v4M15 12h2M15 14h2" />
          </Icon>
        </IconWrap>
        <Title>{t('dropPrompt')}</Title>
        <Hint>{t('dropHint')}</Hint>
      </Container>
      {errorKey && <ErrorText>{t(errorKey)}</ErrorText>}
    </>
  );
}
