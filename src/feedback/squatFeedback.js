
export function getSquatFeedback(kneeAngle, hipAngle, backAngle) {
  if (kneeAngle > 150) {
    return "Stand tall and squat";
  }

  if (backAngle > 40) {
    return "Check your torso lean";
  }

  if (kneeAngle >= 130) {
    return "Squat a little deeper";
  }

  if (hipAngle > 140) {
    return "Bend your hips and knees";
  }

  return "Good depth! Stand back up";
}
