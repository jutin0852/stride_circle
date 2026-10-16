import { WAKA_PRINTS, type WakaPrintName } from './waka-prints';

/**
 * Timeline for the Waka splash. Pure functions of time so the UI thread (Reanimated worklets)
 * and unit tests compute exactly the same frames.
 *
 * 0.00-0.30 two shoes appear at the centre and settle onto the top of the loop
 * 0.30-1.80 nine running strides, left first (L R L R …), one clockwise loop; each landing
 *           stamps a print (left = "WA", right = "KA") that stays behind
 * 1.92-2.62 the trail sweeps once around the centre and gathers into the Waka logo
 * 2.62-2.95 the logo lands with a ~3% settle, then holds until END
 *
 * Units are design px on a 390-wide screen; the component scales them to the device.
 */

export const SPLASH_END = 3.2;
export const DESIGN_WIDTH = 390;

const WALK_START = 0.3;
const SWEEP_START = 1.92;
const SWEEP_END = 2.62;
const SETTLE_END = 2.95;
const STEPS = 9;
const SLOTS = 8;
const RING = 84 * 0.95;                // loop radius
const STRIDE_LAT = 13 * 0.95;          // left foot runs outside the loop, right foot inside
const TOE_OUT = 14;
const PRINT_SIZE = 0.72 * 0.95 * 1.06; // print scale while running
const SWING = 1.15;                    // swing > step length gives a short flight phase
const LIFT = 0.22;                     // a lifted foot draws this much bigger
const TRAIL_OPACITY = 0.38;
const LOGO_PX = 0.25;                  // design px per unit of the 1254-unit logo

const STEP_DURATIONS = Array.from({ length: STEPS }, (_, i) => 0.185 + (0.1483 - 0.185) * (i / (STEPS - 1)));
const STEP_STARTS = STEP_DURATIONS.reduce<number[]>((starts, _, i) => {
  starts.push(i === 0 ? WALK_START : starts[i - 1] + STEP_DURATIONS[i - 1]);
  return starts;
}, []);

export type PrintPose = { x: number; y: number; rotation: number; scale: number; opacity: number };

function clamp(value: number) {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

function lerp(from: number, to: number, t: number) {
  'worklet';
  return from + (to - from) * t;
}

function progress(t: number, start: number, end: number) {
  'worklet';
  return clamp((t - start) / (end - start));
}

function easeInOut(t: number) {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOut(t: number) {
  'worklet';
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuint(t: number) {
  'worklet';
  return t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function slotAngle(slot: number) {
  'worklet';
  return -90 + (360 * slot) / SLOTS;
}

/** Even slots belong to the left foot ("WA"), odd slots to the right foot ("KA"). */
export function printNameForSlot(slot: number): WakaPrintName {
  'worklet';
  return slot % 2 === 0 ? 'WA' : 'KA';
}

function landTime(step: number) {
  'worklet';
  return STEP_STARTS[step] + STEP_DURATIONS[step] * SWING;
}

function ringPose(theta: number, name: WakaPrintName, size: number, pull: number) {
  'worklet';
  const lateral = name === 'WA' ? 1 : -1;
  const radius = (RING + lateral * STRIDE_LAT) * (1 - 0.82 * pull);
  const radians = (theta * Math.PI) / 180;
  return {
    x: radius * Math.cos(radians),
    y: radius * Math.sin(radians),
    rotation: theta + 90 - lateral * TOE_OUT,
    scale: PRINT_SIZE * size,
  };
}

/** The print stamped on `slot` (0-7) by the runner, including its sweep into the logo. */
export function trailPrintPose(t: number, slot: number): PrintPose {
  'worklet';
  const landed = landTime(slot);
  if (t < landed) return { x: 0, y: 0, rotation: 0, scale: 0, opacity: 0 };
  const name = printNameForSlot(slot);
  const sweep = easeInOutQuint(progress(t, SWEEP_START, SWEEP_END));
  const gather = easeInOut(progress(t, SWEEP_START + 0.2, SWEEP_END));
  const since = easeOut(progress(t, landed, landed + 0.22));
  const ring = ringPose(slotAngle(slot) + 360 * sweep, name, 1 + 0.12 * (1 - since), 0);
  const print = WAKA_PRINTS[name];
  const targetRotation = print.logoRotation + 360 * Math.round((ring.rotation - print.logoRotation) / 360);
  const trailOpacity = lerp(0.9, TRAIL_OPACITY, since);
  const isLogoPrint = slot === 0 || slot === SLOTS - 1; // the last WA and KA prints become the logo
  return {
    x: lerp(ring.x, print.logoX * LOGO_PX, gather),
    y: lerp(ring.y, print.logoY * LOGO_PX, gather),
    rotation: lerp(ring.rotation, targetRotation, gather),
    scale: lerp(ring.scale, print.logoScale * LOGO_PX, gather),
    opacity: isLogoPrint ? lerp(trailOpacity, 1, sweep) : trailOpacity * (1 - gather),
  };
}

/** A live shoe: -1 = left ("WA"), 1 = right ("KA"). Hidden once the sweep starts. */
export function runnerFootPose(t: number, foot: -1 | 1): PrintPose {
  'worklet';
  if (t >= SWEEP_START) return { x: 0, y: 0, rotation: 0, scale: 0, opacity: 0 };
  const stance = -0.5;
  let from = stance;
  let to = stance;
  let swing = 1;
  for (let step = foot === -1 ? 0 : 1; step < STEPS; step += 2) {
    if (t < STEP_STARTS[step]) break;
    from = step < 2 ? stance : step - 2;
    to = step;
    swing = clamp((t - STEP_STARTS[step]) / (STEP_DURATIONS[step] * SWING));
    if (swing < 1) break;
  }
  const lifted = swing < 1 ? Math.sin(Math.PI * swing) : 0;
  const intro = easeOut(progress(t, 0, WALK_START));
  const theta = lerp(slotAngle(from), slotAngle(to), easeInOut(swing));
  const pose = ringPose(theta, foot === -1 ? 'WA' : 'KA', (1 + LIFT * lifted) * lerp(0.82, 1, intro), 1 - intro);
  return { ...pose, opacity: intro };
}

/** Scale of the whole mark: a soft ~3% overshoot as the logo lands. */
export function logoSettleScale(t: number) {
  'worklet';
  const settle = progress(t, SWEEP_END, SETTLE_END);
  return 1 + 0.032 * Math.sin(Math.PI * easeOut(settle)) * (1 - settle * 0.4);
}
