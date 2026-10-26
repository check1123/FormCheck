export function getLungeFeedback(kneeAngle, backAngle) {
  if (kneeAngle === null || backAngle === null) {
    return "Position yourself so your full body is visible";
  }

  if (backAngle > 40) {
    return "Keep your torso more upright";
  }

  if (kneeAngle > 150) {
    return "Step forward and bend your knees";
  }

  if (kneeAngle > 110) {
    return "Bend your knees a little deeper";
  }

  return "Good depth! Push back to standing";
}