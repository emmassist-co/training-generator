import { MuscleId, ViewSide } from "../types";

/**
 * SVG path definition for a muscle region
 */
export interface MuscleDef {
  /** Unique muscle identifier */
  id: MuscleId;
  /** Display name (e.g., "Left Biceps", "Right Front Shoulder") */
  name: string;
  /** SVG path data for the 'd' attribute */
  path: string;
  /** Which anatomical view this muscle belongs to */
  view: ViewSide;
}
