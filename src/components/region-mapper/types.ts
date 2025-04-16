export interface RegionMapperProps {
  imageSrc: string;
  onComplete: (regions: Region[]) => void;
  initialRegions?: Region[];
  autoStartDrawing?: boolean;
}

export interface Region {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ActiveRegion extends Region {
  id: string;
  isSelected: boolean;
  isResizing: boolean;
  isDragging: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface SnapPositions {
  x: number[];
  y: number[];
  right: number[];
  bottom: number[];
  centerX: number[];
  centerY: number[];
}
