'use client';

import styled, { keyframes } from 'styled-components';
import type { ImageFile } from '@/lib/types';
import { formatFileSize } from '@/lib/utils';

// Soft UI Evolution Palette
const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  success: '#22C55E',
  error: '#EF4444',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const QueueContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const ImageCard = styled.div<{ $isSelected: boolean }>`
  position: relative;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid ${({ $isSelected }) => ($isSelected ? colors.primary : colors.border)};
  border-radius: 12px;
  background: ${colors.bgCard};
  transition: all 0.2s;
  box-shadow: ${({ $isSelected }) =>
    $isSelected ? `0 0 0 2px ${colors.primary}40` : '0 1px 3px rgba(0,0,0,0.06)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  background: ${colors.bg};
`;

const Thumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px 12px 0 0;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px 12px 0 0;
`;

const SpinnerIcon = styled.svg`
  width: 24px;
  height: 24px;
  color: ${colors.primary};
  animation: ${spin} 1s linear infinite;
`;

const StatusBadge = styled.div<{ $status: 'completed' | 'error' }>`
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $status }) =>
    $status === 'completed' ? colors.success : colors.error};
  border: 2px solid white;
  border-radius: 50%;
`;

const StatusIcon = styled.svg`
  width: 10px;
  height: 10px;
  color: white;
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 50%;
  opacity: 0;
  transition: all 0.2s;
  cursor: pointer;

  ${ImageCard}:hover & {
    opacity: 1;
  }

  &:hover {
    background: ${colors.error};
    border-color: ${colors.error};
    color: white;
  }
`;

const RemoveIcon = styled.svg`
  width: 10px;
  height: 10px;
  color: ${colors.textMuted};

  ${RemoveButton}:hover & {
    color: white;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 0.5rem 0.75rem;
  background: ${colors.bgCard};
  border: 1px solid ${colors.border};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;

  ${ImageCard}:hover & {
    opacity: 1;
  }
`;

const TooltipName = styled.p`
  font-family: var(--font-heading);
  font-size: 0.688rem;
  color: ${colors.text};
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 0.25rem;
`;

const TooltipSize = styled.p`
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: ${colors.textMuted};
  margin: 0;
`;

interface ImageQueueProps {
  images: ImageFile[];
  onRemove: (id: string) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export default function ImageQueue({
  images,
  onRemove,
  selectedId,
  onSelect,
}: ImageQueueProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <QueueContainer>
      {images.map((image) => (
        <ImageCard
          key={image.id}
          onClick={() => onSelect?.(image.id)}
          $isSelected={selectedId === image.id}
        >
          <ImageWrapper>
            <Thumbnail
              src={image.processedImage?.url || image.previewUrl}
              alt={image.name}
            />

            {/* Status indicator */}
            {image.status === 'processing' && (
              <Overlay>
                <SpinnerIcon fill="none" viewBox="0 0 24 24">
                  <circle
                    opacity={0.25}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    opacity={0.75}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </SpinnerIcon>
              </Overlay>
            )}

            {image.status === 'completed' && (
              <StatusBadge $status="completed">
                <StatusIcon fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </StatusIcon>
              </StatusBadge>
            )}

            {image.status === 'error' && (
              <StatusBadge $status="error">
                <StatusIcon fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </StatusIcon>
              </StatusBadge>
            )}

            {/* Remove button */}
            <RemoveButton
              onClick={(e) => {
                e.stopPropagation();
                onRemove(image.id);
              }}
            >
              <RemoveIcon fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </RemoveIcon>
            </RemoveButton>
          </ImageWrapper>

          {/* File info tooltip on hover */}
          <Tooltip>
            <TooltipName>{image.name}</TooltipName>
            <TooltipSize>
              {formatFileSize(image.processedImage?.size || image.size)}
            </TooltipSize>
          </Tooltip>
        </ImageCard>
      ))}
    </QueueContainer>
  );
}
