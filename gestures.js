/**
 * Ortak El Jest Motoru (WebXR & MediaPipe)
 */

export const GESTURES = Object.freeze({
  NONE: 'none',
  WALK: 'walk',
  TURN_RIGHT: 'turn_right',
  TURN_LEFT: 'turn_left'
});

const PRIORITY = [GESTURES.WALK, GESTURES.TURN_RIGHT, GESTURES.TURN_LEFT];

export function distance3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.hypot(dx, dy, dz);
}

export class GestureEngine {
  constructor(options = {}) {
    this.pressThreshold = options.pressThreshold ?? 0.34;
    this.releaseThreshold = options.releaseThreshold ?? 0.46;
    this.minHandScale = options.minHandScale ?? 0.02;

    this.activeGesture = GESTURES.NONE;
    this.activeHand = 'None';
  }

  reset() {
    this.activeGesture = GESTURES.NONE;
    this.activeHand = 'None';
    return this.getState();
  }

  getState() {
    return {
      gesture: this.activeGesture,
      hand: this.activeHand
    };
  }

  evaluateHand(hand) {
    if (
      !hand ||
      !hand.wrist ||
      !hand.middleMcp ||
      !hand.thumbTip ||
      !hand.indexTip ||
      !hand.ringTip ||
      !hand.pinkyTip
    ) {
      return null;
    }

    const handScale = distance3D(hand.wrist, hand.middleMcp);
    if (handScale < this.minHandScale) {
      return null;
    }

    return {
      handedness: hand.handedness || 'unknown',
      distances: {
        [GESTURES.WALK]: distance3D(hand.thumbTip, hand.indexTip) / handScale,
        [GESTURES.TURN_RIGHT]: distance3D(hand.thumbTip, hand.pinkyTip) / handScale,
        [GESTURES.TURN_LEFT]: distance3D(hand.thumbTip, hand.ringTip) / handScale
      }
    };
  }

  update(hands) {
    if (!Array.isArray(hands) || hands.length === 0) {
      return this.reset();
    }

    const evaluated = hands.map((h) => this.evaluateHand(h)).filter(Boolean);
    if (evaluated.length === 0) {
      return this.reset();
    }

    if (this.activeGesture !== GESTURES.NONE) {
      for (const item of evaluated) {
        if (item.distances[this.activeGesture] < this.releaseThreshold) {
          this.activeHand = item.handedness;
          return this.getState();
        }
      }
    }

    for (const gesture of PRIORITY) {
      let bestHand = null;
      let bestDist = Infinity;

      for (const item of evaluated) {
        const d = item.distances[gesture];
        if (d < this.pressThreshold && d < bestDist) {
          bestDist = d;
          bestHand = item.handedness;
        }
      }

      if (bestHand !== null) {
        this.activeGesture = gesture;
        this.activeHand = bestHand;
        return this.getState();
      }
    }

    return this.reset();
  }
}
