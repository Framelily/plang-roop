'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import ReactCrop, { type Crop as RIC_Crop } from 'react-image-crop';
import type { CropRect } from '@/lib/types';
import 'react-image-crop/dist/ReactCrop.css';

const colors = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  primary: '#3B82F6',
  border: '#E2E8F0',
};

const CanvasFrame = styled.div`
  background:
    repeating-conic-gradient(${colors.bg} 0% 25%, ${colors.bgCard} 0% 50%)
      50% / 20px 20px;
  border: 1px solid ${colors.border};
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  overflow: hidden;

  .ReactCrop__crop-selection {
    border: 2px solid ${colors.primary};
    box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.45);
  }
  .ReactCrop__drag-handle {
    background: #ffffff;
    border: 2px solid ${colors.primary};
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }
  .ReactCrop__rule-of-thirds-vt,
  .ReactCrop__rule-of-thirds-hz {
    background: rgba(59, 130, 246, 0.5);
  }
`;

const PreviewImg = styled.img`
  display: block;
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  transform-origin: center center;
`;

interface CropCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  crop: CropRect;
  aspect: number | null;
  onCropChange: (rect: CropRect) => void;
}

export default function CropCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  crop,
  aspect,
  onCropChange,
}: CropCanvasProps) {
  const pxCrop: RIC_Crop = useMemo(
    () => ({
      unit: 'px',
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
    }),
    [crop.x, crop.y, crop.width, crop.height]
  );

  return (
    <CanvasFrame>
      <ReactCrop
        crop={pxCrop}
        aspect={aspect ?? undefined}
        onChange={(c) => {
          if (c.unit === 'px') {
            onCropChange({ x: c.x, y: c.y, width: c.width, height: c.height });
          }
        }}
        ruleOfThirds
        keepSelection
      >
        <PreviewImg
          src={imageUrl}
          alt="To crop"
          width={imageWidth}
          height={imageHeight}
        />
      </ReactCrop>
    </CanvasFrame>
  );
}
