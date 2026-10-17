/**
 * Shapes for the WisePath background: a winding "route" with waypoints and a
 * compass rose. The website (inline SVG) and the Android app (react-native-svg)
 * draw the same motif from this data.
 */

export interface BackgroundGeometry {
  width: number;
  height: number;
  /** A dashed route that winds across the canvas. */
  route: string;
  /** A fainter second route for depth. */
  routeEcho: string;
  waypoints: { x: number; y: number; r: number }[];
  compass: { x: number; y: number; size: number };
  blobs: { x: number; y: number; r: number; tone: 'teal' | 'gold' | 'navy' }[];
}

/** Wide canvas for the website (and tablets). */
export const landscapeGeometry: BackgroundGeometry = {
  width: 1440,
  height: 900,
  route: 'M -40 780 C 160 720 250 560 420 600 S 650 790 830 650 S 1010 360 1190 390 S 1390 230 1500 150',
  routeEcho: 'M -60 860 C 220 820 380 700 560 740 S 860 860 1040 720 S 1300 520 1500 470',
  waypoints: [
    { x: 420, y: 600, r: 7 },
    { x: 830, y: 650, r: 7 },
    { x: 1190, y: 390, r: 9 },
  ],
  compass: { x: 1190, y: 190, size: 120 },
  blobs: [
    { x: 1260, y: 90, r: 420, tone: 'teal' },
    { x: 140, y: 860, r: 460, tone: 'gold' },
    { x: 720, y: 420, r: 520, tone: 'navy' },
  ],
};

/** Tall canvas for phones. */
export const portraitGeometry: BackgroundGeometry = {
  width: 400,
  height: 860,
  route: 'M -20 820 C 60 760 40 640 140 620 S 320 600 300 470 S 120 330 210 250 S 390 150 430 60',
  routeEcho: 'M -30 700 C 40 660 120 690 200 640 S 360 520 430 520',
  waypoints: [
    { x: 140, y: 620, r: 5 },
    { x: 300, y: 470, r: 5 },
    { x: 210, y: 250, r: 6 },
  ],
  compass: { x: 330, y: 120, size: 70 },
  blobs: [
    { x: 380, y: 40, r: 220, tone: 'teal' },
    { x: 20, y: 840, r: 240, tone: 'gold' },
  ],
};

/** Compass rose centred on (0,0) with radius 1; scale with `size`. Four long points, four short. */
export const compassRose = {
  major: 'M 0 -1 L 0.14 -0.14 L 1 0 L 0.14 0.14 L 0 1 L -0.14 0.14 L -1 0 L -0.14 -0.14 Z',
  minor: 'M 0 -0.58 L 0.1 -0.1 L 0.58 0 L 0.1 0.1 L 0 0.58 L -0.1 0.1 L -0.58 0 L -0.1 -0.1 Z',
  rings: [0.78, 0.86],
} as const;
