'use client';

import styled from 'styled-components';

// Soft UI Evolution Palette
const colors = {
  bg: '#F8FAFC',
  primary: '#3B82F6',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Title = styled.h3`
  font-family: var(--font-heading);
  font-size: 0.875rem;
  color: ${colors.text};
  font-weight: 700;
  margin: 0;
`;

const Description = styled.p`
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: ${colors.textMuted};
  margin: 0;

  span {
    color: ${colors.primary};
    font-weight: 600;
  }
`;

const PreviewFrame = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #CBD5E1;
  border-radius: 12px;
  background:
    repeating-conic-gradient(${colors.bg} 0% 25%, white 0% 50%)
    50% / 20px 20px;
  position: relative;
  overflow: hidden;
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
