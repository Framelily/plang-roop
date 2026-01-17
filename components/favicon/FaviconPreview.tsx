'use client';

import styled from 'styled-components';
import type { GeneratedFavicon } from '@/lib/favicon/generator';

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

const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Title = styled.h3`
  font-family: var(--font-pixel);
  font-size: 0.625rem;
  color: ${colors.neonPink};
  text-shadow: 0 0 10px ${colors.neonPink}60;
  margin: 0;
  text-transform: uppercase;
`;

const IcoIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${colors.bgCard};
  border: 2px solid ${colors.neonGreen};
  box-shadow: 0 0 10px ${colors.neonGreen}30;
`;

const CheckIcon = styled.svg`
  width: 16px;
  height: 16px;
  color: ${colors.neonGreen};
`;

const IcoText = styled.span`
  font-family: var(--font-terminal);
  font-size: 1rem;
  color: ${colors.neonGreen};
`;

const FaviconsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
`;

const FaviconItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const FaviconFrame = styled.div<{ $frameSize: number }>`
  width: ${({ $frameSize }) => $frameSize}px;
  height: ${({ $frameSize }) => $frameSize}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.bgLight};
  border: 2px solid ${colors.border};
  transition: all 0.2s;

  &:hover {
    border-color: ${colors.neonCyan};
    box-shadow: 0 0 10px ${colors.neonCyan}40;
  }
`;

const FaviconImage = styled.img<{ $pixelated: boolean }>`
  image-rendering: ${({ $pixelated }) => ($pixelated ? 'pixelated' : 'auto')};
`;

const SizeLabel = styled.span`
  font-family: var(--font-terminal);
  font-size: 0.875rem;
  color: ${colors.textMuted};
`;

interface FaviconPreviewProps {
  favicons: GeneratedFavicon[];
}

export default function FaviconPreview({ favicons }: FaviconPreviewProps) {
  if (favicons.length === 0) return null;

  // Separate ICO from PNGs for display
  const icoFile = favicons.find((f) => f.isIco);
  const pngFiles = favicons.filter((f) => !f.isIco);

  return (
    <PreviewContainer>
      <Title>Generated Favicons</Title>

      {/* ICO file indicator */}
      {icoFile && (
        <IcoIndicator>
          <CheckIcon fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </CheckIcon>
          <IcoText>favicon.ico (16x16, 32x32, 48x48)</IcoText>
        </IcoIndicator>
      )}

      {/* PNG previews */}
      <FaviconsGrid>
        {pngFiles.map((favicon) => (
          <FaviconItem key={favicon.name}>
            <FaviconFrame $frameSize={Math.max(favicon.size + 16, 48)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <FaviconImage
                src={favicon.url}
                alt={favicon.name}
                width={favicon.size}
                height={favicon.size}
                $pixelated={favicon.size <= 32}
              />
            </FaviconFrame>
            <SizeLabel>
              {favicon.size}x{favicon.size}
            </SizeLabel>
          </FaviconItem>
        ))}
      </FaviconsGrid>
    </PreviewContainer>
  );
}
