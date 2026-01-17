'use client';

import styled from 'styled-components';

// Pixel Art Color Palette
const colors = {
  bg: '#0F0F23',
  bgLight: '#1a1a2e',
  bgCard: '#16213e',
  neonPink: '#FF71CE',
  neonCyan: '#01CDFE',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  border: '#2D3748',
};

const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Title = styled.h3`
  font-family: var(--font-pixel);
  font-size: 0.625rem;
  color: ${colors.neonPink};
  text-shadow: 0 0 10px ${colors.neonPink}60;
  margin: 0;
  text-transform: uppercase;
`;

const Description = styled.p`
  font-family: var(--font-terminal);
  font-size: 1rem;
  color: ${colors.textMuted};
  margin: 0;

  span {
    color: ${colors.neonCyan};
  }
`;

const PreviewFrame = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px dashed ${colors.border};
  background:
    repeating-conic-gradient(${colors.bgLight} 0% 25%, ${colors.bgCard} 0% 50%)
    50% / 20px 20px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid ${colors.neonCyan}40;
    pointer-events: none;
  }
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

interface CropPreviewProps {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
}

export default function CropPreview({
  imageUrl,
  originalWidth,
  originalHeight,
}: CropPreviewProps) {
  const size = Math.max(originalWidth, originalHeight);

  // Calculate display size (max 300px)
  const displaySize = Math.min(300, size);

  return (
    <PreviewContainer>
      <Title>Fit Preview</Title>
      <Description>
        Image will be centered in a square (<span>{size}x{size}px</span>)
      </Description>
      <PreviewFrame $size={displaySize}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <PreviewImage src={imageUrl} alt="Fit preview" />
      </PreviewFrame>
    </PreviewContainer>
  );
}
