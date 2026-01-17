'use client';

import styled, { keyframes } from 'styled-components';
import type { ImageFile } from '@/lib/types';
import { formatFileSize } from '@/lib/utils';

// Pixel Art Color Palette
const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  bgCard: '#16213e',
  neonPink: '#FF71CE',
  neonCyan: '#01CDFE',
  neonGreen: '#05FFA1',
  error: '#F43F5E',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
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
  border: 3px solid ${({ $isSelected }) => ($isSelected ? colors.neonCyan : colors.border)};
  background: ${colors.bgCard};
  transition: all 0.2s;
  box-shadow: ${({ $isSelected }) =>
    $isSelected ? `0 0 15px ${colors.neonCyan}60` : 'none'};

  &:hover {
    border-color: ${colors.neonPink};
    box-shadow: 0 0 15px ${colors.neonPink}40;
  }
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  background: ${colors.bgLight};
`;

const Thumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
`;

const SpinnerIcon = styled.svg`
  width: 24px;
  height: 24px;
  color: ${colors.neonCyan};
  animation: ${spin} 1s linear infinite;
`;

const StatusBadge = styled.div<{ $status: 'completed' | 'error' }>`
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $status }) =>
    $status === 'completed' ? colors.neonGreen : colors.error};
  border: 2px solid ${colors.bg};
`;

const StatusIcon = styled.svg`
  width: 10px;
  height: 10px;
  color: ${colors.bg};
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
  border: 2px solid ${colors.border};
  opacity: 0;
  transition: all 0.2s;
  cursor: pointer;

  ${ImageCard}:hover & {
    opacity: 1;
  }

  &:hover {
    background: ${colors.error};
    border-color: ${colors.error};
  }
`;

const RemoveIcon = styled.svg`
  width: 10px;
  height: 10px;
  color: ${colors.text};
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 0.5rem;
  background: ${colors.bgCard};
  border: 2px solid ${colors.neonCyan};
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
  font-family: var(--font-pixel);
  font-size: 0.375rem;
  color: ${colors.text};
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 0.25rem;
`;

const TooltipSize = styled.p`
  font-family: var(--font-terminal);
  font-size: 0.875rem;
  color: ${colors.neonCyan};
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
