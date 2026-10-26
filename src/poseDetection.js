import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let poseLandmarker = null;

export async function initializePoseDetection() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm'
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
    },
    runningMode: 'VIDEO',
    numPoses: 1
  });

  return poseLandmarker;
}

export function detectPose(video) {
  if (!poseLandmarker || video.readyState < 2) {
    return null;
  }

  const results = poseLandmarker.detectForVideo(
    video,
    performance.now()
  );

  return results.landmarks;
}

export function calculateAngle(hip, knee, ankle) {
  const radians = Math.atan2(
    ankle.y - knee.y,
    ankle.x - knee.x
  ) - Math.atan2(
    hip.y - knee.y,
    hip.x - knee.x
  );


  let degrees = Math.abs(radians * (180 / Math.PI));

  if (degrees > 180) {
    degrees = 360 - degrees;
  }

  return degrees;
}

export function calculateBackAngle(shoulder, hip) {
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y;

  // Estimate torso lean relative to vertical.
  return Math.atan2(Math.abs(dx), Math.abs(dy)) * (180 / Math.PI);
}
