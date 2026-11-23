import assert from 'node:assert/strict';
import { GestureEngine, GESTURES } from '../js/gestures.js';

function makeHand({ indexDist = 0.8, pinkyDist = 0.8, ringDist = 0.8, handedness = 'right' } = {}) {
  return {
    handedness,
    wrist: { x: 0, y: 0, z: 0 },
    middleMcp: { x: 0, y: 1, z: 0 },
    thumbTip: { x: 0, y: 0, z: 0 },
    indexTip: { x: indexDist, y: 0, z: 0 },
    pinkyTip: { x: pinkyDist, y: 0, z: 0 },
    ringTip: { x: ringDist, y: 0, z: 0 }
  };
}

const engine = new GestureEngine();

assert.equal(engine.update([makeHand()]).gesture, GESTURES.NONE);
assert.equal(engine.update([makeHand({ indexDist: 0.25 })]).gesture, GESTURES.WALK);
assert.equal(engine.update([makeHand({ indexDist: 0.40 })]).gesture, GESTURES.WALK);
assert.equal(engine.update([makeHand({ indexDist: 0.50 })]).gesture, GESTURES.NONE);
assert.equal(engine.update([makeHand({ indexDist: 0.20, pinkyDist: 0.20 })]).gesture, GESTURES.WALK);

engine.reset();
assert.equal(engine.update([makeHand({ pinkyDist: 0.20 })]).gesture, GESTURES.TURN_RIGHT);
assert.equal(engine.update([]).gesture, GESTURES.NONE);
assert.equal(engine.update([makeHand({ ringDist: 0.20, handedness: 'left' })]).gesture, GESTURES.TURN_LEFT);

console.log('Tüm jest algılama testleri başarıyla geçti.');
