export interface SpeechWaveProps {
  active?: boolean;
  /** Measured audio level, 0–1. Defaults to silence (0), without synthetic pulses. */
  level?: number;
  /** Literal Canvas/CSS colors, e.g. #6366f1 or rgb(99, 102, 241). */
  colors?: string[];
  height?: number;
  /** Motion speed multiplier, 0–5. Zero renders a static shape. Default 1. */
  speed?: number;
  /** Visual amplitude gain, 0–3. Default 1.5; does not alter measured level. */
  intensity?: number;
}
