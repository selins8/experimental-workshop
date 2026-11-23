const REQUIRED_JOINTS = [
  'wrist',
  'middle-finger-metacarpal',
  'thumb-tip',
  'index-finger-tip',
  'ring-finger-tip',
  'pinky-finger-tip'
];

export class WebXRHandTracker {
  constructor() {
    this.isTracking = false;
  }

  extractHands(frame, referenceSpace) {
    if (!frame || !referenceSpace || !frame.getJointPose) {
      this.isTracking = false;
      return [];
    }

    const session = frame.session;
    const hands = [];

    for (const inputSource of session.inputSources) {
      if (!inputSource.hand) continue;

      const joints = {};
      let valid = true;

      for (const jointName of REQUIRED_JOINTS) {
        const jointSpace = inputSource.hand.get(jointName);
        if (!jointSpace) {
          valid = false;
          break;
        }
        const pose = frame.getJointPose(jointSpace, referenceSpace);
        if (!pose) {
          valid = false;
          break;
        }
        const p = pose.transform.position;
        joints[jointName] = { x: p.x, y: p.y, z: p.z };
      }

      if (valid) {
        hands.push({
          handedness: inputSource.handedness || 'unknown',
          wrist: joints['wrist'],
          middleMcp: joints['middle-finger-metacarpal'],
          thumbTip: joints['thumb-tip'],
          indexTip: joints['index-finger-tip'],
          ringTip: joints['ring-finger-tip'],
          pinkyTip: joints['pinky-finger-tip']
        });
      }
    }

    this.isTracking = hands.length > 0;
    return hands;
  }
}
