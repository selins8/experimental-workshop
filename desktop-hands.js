const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

export class DesktopHandTracker {
  constructor(videoEl, canvasEl, wrapperEl, onError) {
    this.videoEl = videoEl;
    this.canvasEl = canvasEl;
    this.wrapperEl = wrapperEl;
    this.ctx = canvasEl.getContext('2d');
    this.onError = onError;

    this.landmarker = null;
    this.stream = null;
    this.running = false;
    this.lastVideoTime = -1;
    this.latestHands = [];
  }

  async _initModel() {
    if (this.landmarker) return;

    const visionModule = await import(`${MEDIAPIPE_CDN}/vision_bundle.mjs`);
    const { FilesetResolver, HandLandmarker } = visionModule;

    const vision = await FilesetResolver.forVisionTasks(`${MEDIAPIPE_CDN}/wasm`);
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
  }

  async start() {
    if (this.running) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Bu tarayıcı webcam erişimini desteklemiyor.');
    }

    await this._initModel();

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false
    });

    this.videoEl.srcObject = this.stream;
    await this.videoEl.play();

    this.canvasEl.width = this.videoEl.videoWidth || 640;
    this.canvasEl.height = this.videoEl.videoHeight || 480;
    this.wrapperEl.classList.remove('hidden');
    this.running = true;
  }

  stop() {
    this.running = false;
    this.latestHands = [];
    this.lastVideoTime = -1;

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    this.videoEl.srcObject = null;
    this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    this.wrapperEl.classList.add('hidden');
  }

  detect() {
    if (!this.running || !this.landmarker || this.videoEl.readyState < 2) {
      return [];
    }

    if (this.videoEl.currentTime === this.lastVideoTime) {
      return this.latestHands;
    }
    this.lastVideoTime = this.videoEl.currentTime;

    const result = this.landmarker.detectForVideo(this.videoEl, performance.now());
    this._drawOverlay(result.landmarks);

    if (!result.landmarks || result.landmarks.length === 0) {
      this.latestHands = [];
      return [];
    }

    this.latestHands = result.landmarks.map((lm, idx) => {
      const handedness =
        result.handednesses?.[idx]?.[0]?.categoryName?.toLowerCase() || 'unknown';
      return {
        handedness,
        wrist: lm[0],
        middleMcp: lm[9],
        thumbTip: lm[4],
        indexTip: lm[8],
        ringTip: lm[16],
        pinkyTip: lm[20]
      };
    });

    return this.latestHands;
  }

  _drawOverlay(allLandmarks) {
    const w = this.canvasEl.width;
    const h = this.canvasEl.height;
    this.ctx.clearRect(0, 0, w, h);

    if (!allLandmarks) return;

    this.ctx.lineWidth = 2;
    for (const lm of allLandmarks) {
      this.ctx.strokeStyle = '#3fb950';
      for (const [a, b] of HAND_CONNECTIONS) {
        this.ctx.beginPath();
        this.ctx.moveTo(lm[a].x * w, lm[a].y * h);
        this.ctx.lineTo(lm[b].x * w, lm[b].y * h);
        this.ctx.stroke();
      }

      for (let i = 0; i < lm.length; i++) {
        const isTip = i === 4 || i === 8 || i === 16 || i === 20;
        this.ctx.fillStyle = isTip ? '#ff7b72' : '#e6edf3';
        this.ctx.beginPath();
        this.ctx.arc(lm[i].x * w, lm[i].y * h, isTip ? 5 : 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }
}
