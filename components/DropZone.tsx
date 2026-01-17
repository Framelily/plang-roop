'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styled, { keyframes } from 'styled-components';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/types';

// Pixel Art Color Palette
const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  bgCard: '#16213e',
  neonPink: '#FF71CE',
  neonCyan: '#01CDFE',
  neonGreen: '#05FFA1',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
};

const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 10px ${colors.neonCyan}40; }
  50% { box-shadow: 0 0 20px ${colors.neonCyan}80; }
`;

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
  background: ${colors.bgCard};
  border: 3px dashed ${({ $isDragActive, $isDragReject }) =>
    $isDragReject ? colors.neonPink : $isDragActive ? colors.neonCyan : colors.border};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all 0.2s;
  box-shadow: ${({ $isDragActive }) =>
    $isDragActive ? `0 0 20px ${colors.neonCyan}60` : `inset 0 0 30px ${colors.bg}80`};

  &:hover {
    border-color: ${colors.neonCyan};
    box-shadow: 0 0 15px ${colors.neonCyan}40;
  }
`;

const CompactContainer = styled.div<{ $isDragActive: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${colors.bgCard};
  border: 2px dashed ${({ $isDragActive }) => ($isDragActive ? colors.neonCyan : colors.border)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all 0.2s;

  &:hover {
    border-color: ${colors.neonCyan};
    background: ${colors.bgLight};
  }
`;

const IconContainer = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.bgLight};
  border: 2px solid ${colors.border};
  margin-bottom: 1rem;

  /* Pixel corners */
  clip-path: polygon(
    0% 15%, 15% 15%, 15% 0%,
    85% 0%, 85% 15%, 100% 15%,
    100% 85%, 85% 85%, 85% 100%,
    15% 100%, 15% 85%, 0% 85%
  );
`;

const Icon = styled.svg`
  width: 32px;
  height: 32px;
  color: ${colors.neonCyan};
`;

const SmallIcon = styled.svg`
  width: 16px;
  height: 16px;
  color: ${colors.neonCyan};
`;

const Title = styled.p`
  font-family: var(--font-pixel);
  font-size: 0.625rem;
  color: ${colors.text};
  text-align: center;
  margin: 0 0 0.5rem;
  line-height: 1.6;
`;

const Subtitle = styled.p`
  font-family: var(--font-terminal);
  font-size: 1.125rem;
  color: ${colors.textMuted};
  text-align: center;
  margin: 0 0 0.5rem;
`;

const SupportText = styled.p`
  font-family: var(--font-terminal);
  font-size: 0.875rem;
  color: ${colors.neonGreen};
  margin: 0;

  &::before {
    content: '> ';
    color: ${colors.neonPink};
  }
`;

const CompactText = styled.span`
  font-family: var(--font-terminal);
  font-size: 1rem;
  color: ${colors.textMuted};
`;

const BlinkingCursor = styled.span`
  animation: ${blink} 1s infinite;
  color: ${colors.neonCyan};
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
        <CompactText>ADD MORE</CompactText>
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
          DROP {multiple ? 'FILES' : 'FILE'} HERE<BlinkingCursor>_</BlinkingCursor>
        </Title>
      ) : (
        <>
          <Title>
            DRAG & DROP {multiple ? 'IMAGES' : 'IMAGE'}
          </Title>
          <Subtitle>
            or click to select {multiple ? 'files' : 'a file'}
          </Subtitle>
          <SupportText>
            Supports: JPG, PNG, WebP (max 50MB)
          </SupportText>
        </>
      )}
    </DropZoneContainer>
  );
}
