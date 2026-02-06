'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/types';

const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#CBD5E1',
  borderLight: '#E2E8F0',
  success: '#22C55E',
};

interface DropZoneContainerProps {
  $isDragActive: boolean;
  $isDragReject: boolean;
  $disabled: boolean;
}

const DropZoneContainer = styled.div<DropZoneContainerProps>`
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: ${({ $isDragActive }) => ($isDragActive ? colors.primaryLight : colors.bgCard)};
  border: 2px dashed ${({ $isDragActive, $isDragReject }) =>
    $isDragReject ? '#EF4444' : $isDragActive ? colors.primary : colors.border};
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

const CompactContainer = styled.div<{ $isDragActive: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${colors.bgCard};
  border: 2px dashed ${({ $isDragActive }) => ($isDragActive ? colors.primary : colors.borderLight)};
  border-radius: 12px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${colors.primary};
    background: ${colors.primaryLight};
  }
`;

const IconContainer = styled.div`
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

const SmallIcon = styled.svg`
  width: 16px;
  height: 16px;
  color: ${colors.primary};
`;

const Title = styled.p`
  font-family: var(--font-heading);
  font-size: 1rem;
  color: ${colors.text};
  text-align: center;
  margin: 0 0 0.5rem;
  line-height: 1.6;
`;

const Subtitle = styled.p`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.textMuted};
  text-align: center;
  margin: 0 0 0.5rem;
`;

const SupportText = styled.p`
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: ${colors.textMuted};
  margin: 0;
`;

const CompactText = styled.span`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.textMuted};
`;

interface DropZoneProps {
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export default function DropZone({
  onFileSelect,
  onFilesSelect,
  multiple = false,
  disabled = false,
  compact = false,
}: DropZoneProps) {
  const t = useTranslations('dropzone');
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        if (multiple && onFilesSelect) {
          onFilesSelect(acceptedFiles);
        } else if (onFileSelect) {
          onFileSelect(acceptedFiles[0]);
        }
      }
    },
    [onFileSelect, onFilesSelect, multiple]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple,
    disabled,
  });

  // Compact version for adding more images
  if (compact) {
    return (
      <CompactContainer
        {...getRootProps()}
        $isDragActive={isDragActive}
        $disabled={disabled}
      >
        <input {...getInputProps()} />
        <SmallIcon fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </SmallIcon>
        <CompactText>{t('addMore')}</CompactText>
      </CompactContainer>
    );
  }

  return (
    <DropZoneContainer
      {...getRootProps()}
      $isDragActive={isDragActive}
      $isDragReject={isDragReject}
      $disabled={disabled}
    >
      <input {...getInputProps()} />

      <IconContainer>
        <Icon fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </Icon>
      </IconContainer>

      {isDragActive ? (
        <Title>
          {multiple ? t('dropFiles') : t('dropFile')}
        </Title>
      ) : (
        <>
          <Title>
            {multiple ? t('dragImages') : t('dragImage')}
          </Title>
          <Subtitle>
            {multiple ? t('clickToSelectMultiple') : t('clickToSelect')}
          </Subtitle>
          <SupportText>
            {t('supports')}
          </SupportText>
        </>
      )}
    </DropZoneContainer>
  );
}
