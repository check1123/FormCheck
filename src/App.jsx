
import './App.css';
import { useState, useRef, useEffect } from 'react';
import {
  initializePoseDetection,
  detectPose,
  calculateAngle,
  calculateBackAngle
} from './poseDetection';
import { getSquatFeedback } from './feedback/squatFeedback';
import { getLungeFeedback } from './feedback/lungeFeedback';

function BottomNavigation({ currentScreen, setCurrentScreen }) {
  const activeTab =
    currentScreen === 'home'
      ? 'home'
      : currentScreen === 'results'
      ? 'progress'
      : 'workouts';

  return (
    <nav className="bottom-nav">
      <button
        className={activeTab === 'home' ? 'nav-button active' : 'nav-button'}
        onClick={() => setCurrentScreen('home')}
      >
        <span>⌂</span>
        Home
      </button>

      <button
        className={activeTab === 'workouts' ? 'nav-button active' : 'nav-button'}
        onClick={() => setCurrentScreen('exercises')}
      >
        <span>♧</span>
        Workouts
      </button>

      <button
        className={activeTab === 'progress' ? 'nav-button active' : 'nav-button'}
        onClick={() => setCurrentScreen('results')}
      >
        <span>▥</span>
        Progress
      </button>
    </nav>
  );
}

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const videoRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const [poseStatus, setPoseStatus] = useState('Not initialized');
  const [reps, setReps] = useState(0);

  const repsRef = useRef(0);

  useEffect(() => {
    repsRef.current = reps;
  }, [reps]);

  const [completedWorkouts, setCompletedWorkouts] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [totalSquatReps, setTotalSquatReps] = useState(0);
  const [totalLungeReps, setTotalLungeReps] = useState(0);
  const workoutStartTimeRef = useRef(null);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const squatPhaseRef = useRef('standing');
  const lungePhaseRef = useRef('standing');
  const uprightFramesRef = useRef(0);
  const stopGestureFramesRef = useRef(0);
  const [workoutFinished, setWorkoutFinished] = useState(false);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [formStatus, setFormStatus] = useState('Waiting for hand raise');
  const [speedWarning, setSpeedWarning] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const squatDownTimeRef = useRef(null);
  const canvasRef = useRef(null);
  const workoutStartedRef = useRef(false);
  const [kneeAngle, setKneeAngle] = useState(null);
  const [hipAngle, setHipAngle] = useState(null);
  const [backAngleValue, setBackAngleValue] = useState(null);
  const smoothedAnglesRef = useRef({
    knee: null,
    hip: null,
    back: null
  });
  const lastFeedbackRef = useRef('');
  const feedbackChangeTimeRef = useRef(0);
  

  useEffect(() => {
    if (
      currentScreen !== 'camera' &&
      currentScreen !== 'lunge-camera'
    ) return;
    let stream;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });

        setPoseStatus('Loading pose detector...');

        await initializePoseDetection();

        setPoseStatus('Pose detector ready');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        setCameraError('Camera access failed. Please allow camera permission and try again.');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentScreen]);
 
useEffect(() => {
  if (
    currentScreen !== 'camera' &&
    currentScreen !== 'lunge-camera'
  ) return;

  let animationId;


function drawPose() {
  const video = videoRef.current;
  const canvas = canvasRef.current;

  if (video && canvas && video.readyState >= 2) {
    const ctx = canvas.getContext('2d');

    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const landmarks = detectPose(video);

    if (landmarks && landmarks.length > 0) {
      const body = landmarks[0];

   
      const leftHandRaised =
        body[15].visibility > 0.6 &&
        body[15].y < body[0].y - 0.1;

      const rightHandRaised =
        body[16].visibility > 0.6 &&
        body[16].y < body[0].y - 0.1;
   
      /*const armsCrossed =
        body[15].x > body[12].x &&
        body[16].x < body[11].x &&
        body[15].y > body[11].y &&
        body[16].y > body[12].y &&
        body[13].y < body[11].y + 0.15 &&
        body[14].y < body[12].y + 0.15;*/

    
        if (
          !workoutStartedRef.current &&
          rightHandRaised
        ) {
          workoutStartedRef.current = true;
          setWorkoutStarted(true);
          workoutStartTimeRef.current = Date.now();

          squatPhaseRef.current = 'waiting';
          lungePhaseRef.current = 'standing';
          uprightFramesRef.current = 0;
          stopGestureFramesRef.current = 0;
          setReps(0);
          setSpeedWarning(false);
          setFormStatus('Get into position');
        }

        if (
          workoutStartedRef.current &&
          !workoutFinished &&
          (
            squatPhaseRef.current !== 'waiting' ||
            currentScreen === 'lunge-camera'
          )
        ) {
          if (leftHandRaised) {
            stopGestureFramesRef.current += 1;
          } else {
            stopGestureFramesRef.current = 0;
          }

          if (stopGestureFramesRef.current >= 20) {
            workoutStartedRef.current = false;
            setWorkoutStarted(false);
            setWorkoutFinished(true);
            const endTime = Date.now();
            const startTime = workoutStartTimeRef.current;

            setWorkoutDuration(
              startTime
                ? Math.floor((endTime - startTime) / 1000)
                : 0
            );
            setCurrentScreen('results');
            const finalReps = repsRef.current;

            setCompletedWorkouts(previous => previous + 1);
            setTotalReps(previous => previous + finalReps);

            if (selectedExercise === 'squat') {
              setTotalSquatReps(previous => previous + finalReps);
            } else if (selectedExercise === 'lunge') {
              setTotalLungeReps(previous => previous + finalReps);
            }
            setFormStatus('Workout finished');
            stopGestureFramesRef.current = 0;
            squatPhaseRef.current = 'standing';
          }
        }

        if (workoutStartedRef.current && !workoutFinished) {
          const leftKneeAngle = calculateAngle(
            body[23],
            body[25],
            body[27]
          );
          const rightKneeAngle = calculateAngle(
            body[24],
            body[26],
            body[28]
          );
          const leftHipAngle = calculateAngle(body[11], body[23], body[25]);
          const backAngle = calculateBackAngle(body[11], body[23]);
          const previous = smoothedAnglesRef.current;
          const alpha = 0.25;

          const smooth = (oldValue, newValue) =>
            oldValue === null
              ? newValue
              : oldValue + alpha * (newValue - oldValue);

          const newKnee = smooth(previous.knee, leftKneeAngle);
          const newHip = smooth(previous.hip, leftHipAngle);
          const newBack = smooth(previous.back, backAngle);

          smoothedAnglesRef.current = {
            knee: newKnee,
            hip: newHip,
            back: newBack
          };

          setKneeAngle(newKnee);
          setHipAngle(newHip);
          setBackAngleValue(newBack);

         if (
            currentScreen === 'lunge-camera' ||
            squatPhaseRef.current !== 'waiting'
          ) {
            const feedback =
              currentScreen === 'lunge-camera'
                ? getLungeFeedback(
                    Math.min(leftKneeAngle, rightKneeAngle),
                    backAngle
                  )
                : getSquatFeedback(
                    leftKneeAngle,
                    leftHipAngle,
                    backAngle
                  );
                console.log('Exercise:', currentScreen, 'Feedback:', feedback);

            const now = Date.now();

            if (feedback !== lastFeedbackRef.current) {
              if (now - feedbackChangeTimeRef.current >= 1000) {
                lastFeedbackRef.current = feedback;
                feedbackChangeTimeRef.current = now;
                setFormStatus(feedback);
              }
            } else {
              feedbackChangeTimeRef.current = now;
            }
          }
        
          if (currentScreen === 'lunge-camera') {
            const lowestKneeAngle = Math.min(
              leftKneeAngle,
              rightKneeAngle
            );

            if (
              lowestKneeAngle < 110 &&
              lungePhaseRef.current === 'standing'
            ) {
              lungePhaseRef.current = 'down';
            }

            if (
              lowestKneeAngle > 155 &&
              lungePhaseRef.current === 'down'
            ) {
              setReps(previousReps => previousReps + 1);
              lungePhaseRef.current = 'standing';
            }
          }

        if (currentScreen === 'camera') {
          if (squatPhaseRef.current === 'waiting') {
            if (leftKneeAngle > 150) {
              uprightFramesRef.current += 1;
            } else {
              uprightFramesRef.current = 0;
            }

            if (uprightFramesRef.current >= 10) {
              squatPhaseRef.current = 'standing';
              setFormStatus('Workout active');
            }
          } else {
            if (
              leftKneeAngle < 130 &&
              squatPhaseRef.current === 'standing'
            ) {
              squatPhaseRef.current = 'down';
              squatDownTimeRef.current = Date.now();
            }

            if (
              leftKneeAngle > 165 &&
              squatPhaseRef.current === 'down'
            ) {
              const squatDuration = squatDownTimeRef.current
                ? (Date.now() - squatDownTimeRef.current) / 1000
                : null;

              if (squatDuration !== null && squatDuration < 1) {
                setSpeedWarning(true);
              } else {
                setSpeedWarning(false);
              }

              squatDownTimeRef.current = null;
              setReps(previousReps => previousReps + 1);
              squatPhaseRef.current = 'standing';
            }
          }
        }
      }
      const connections = [
        [11, 12], [11, 23], [12, 24], [23, 24],
        [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
        [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
        [23, 25], [25, 27], [27, 29], [27, 31],
        [24, 26], [26, 28], [28, 30], [28, 32]
      ];

      ctx.strokeStyle = '#39FF88';
      ctx.lineWidth = 3;

      for (const [start, end] of connections) {
        const x1 = body[start].x * canvas.width;
        const y1 = body[start].y * canvas.height;
        const x2 = body[end].x * canvas.width;
        const y2 = body[end].y * canvas.height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      for (const point of body) {
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#39FF88';
        ctx.fill();
      }
    }
  }

  animationId = requestAnimationFrame(drawPose);
}


  drawPose();

  return () => cancelAnimationFrame(animationId);
}, [currentScreen]);


  return (
    <main className="home-screen">
      {currentScreen === 'home' ? (
        <>
          <h1>FormCheck</h1>
          <p>Move better. Train smarter.</p>

          <div className="stats-container">
            <div className="stat-card">
              <p>COMPLETED</p>
              <span>{completedWorkouts}</span>
            </div>

            <div className="stat-card">
              <p>TOTAL REPS</p>
              <span>{totalReps}</span>
            </div>

            <div className="stat-card">
              <p>SQUAT REPS</p>
              <span>{totalSquatReps}</span>
            </div>

            <div className="stat-card">
              <p>LUNGE REPS</p>
              <span>{totalLungeReps}</span>
            </div>
          </div>

          <button
            className="start-button"
            onClick={() => setCurrentScreen('exercises')}
          >
            Start Workout
          </button>
        </>
      ) : currentScreen === 'exercises' ? (
        <>
          <h1>Choose an Exercise</h1>
          <p>Select the workout you want to practice.</p>

          <button
            className="start-button"
            onClick={() => {
              setSelectedExercise('squat');
              setCurrentScreen('instructions');
            }}
          >
            Squat
          </button>


          <button
            className="start-button"
            onClick={() => {
              setSelectedExercise('lunge');
              setCurrentScreen('lunge-instructions');
            }}
          >
            Lunge
          </button>

          <button
            className="back-button"
            onClick={() => setCurrentScreen('home')}
          >
            Back to Home
          </button>
        </>
     ) : currentScreen === 'results' ? (
  <>
        <h1>Workout Complete!</h1>
        <p>Great job finishing your squat workout.</p>

        <div className="stats-container">
          <div className="stat-card">
            <p>TOTAL SQUATS</p>
            <span>{reps}</span>
          </div>


          <div className="stat-card">
            <p>DURATION</p>
            <span>
              {Math.floor(workoutDuration / 60)}:
              {String(workoutDuration % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="instruction-card">
          <h2>Overall Feedback</h2>
          <p>
            {reps === 0
              ? 'No complete squats were recorded this session. Try again and focus on completing each movement.'
              : reps < 5
              ? `You completed ${reps} squat${reps === 1 ? '' : 's'}! Keep practicing at a comfortable pace and focus on controlled movement.`
              : `You completed ${reps} squats! Great effort. Keep focusing on controlled movement and consistent form.`}
          </p>
        </div>

        <button
          className="start-button"
          onClick={() => {
            setReps(0);
            setWorkoutDuration(0);
            setWorkoutFinished(false);
            setWorkoutStarted(false);
            workoutStartedRef.current = false;
            workoutStartTimeRef.current = null;
            stopGestureFramesRef.current = 0;
            uprightFramesRef.current = 0;
            squatPhaseRef.current = 'standing';
            setFormStatus('Waiting for hand raise');
            lungePhaseRef.current = 'standing';
            setCurrentScreen(
              selectedExercise === 'lunge'
                ? 'lunge-instructions'
                : 'instructions'
            );
          }}
        >
          Workout Again
        </button>

        <button
          className="back-button"
          onClick={() => {
            setReps(0);
            setWorkoutDuration(0);
            setWorkoutFinished(false);
            setWorkoutStarted(false);
            workoutStartedRef.current = false;
            workoutStartTimeRef.current = null;
            stopGestureFramesRef.current = 0;
            uprightFramesRef.current = 0;
            squatPhaseRef.current = 'standing';
            setFormStatus('Waiting for hand raise');
            setCurrentScreen('home');
          }}
        >
          Back to Home
        </button>
      </>
    ) : currentScreen === 'lunge-camera' ? (
      
        <div className="camera-workout">

        
        <div className="camera-container">
          <div className="camera-placeholder">
            {cameraError ? (
              <span>{cameraError}</span>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                />
                <canvas
                  ref={canvasRef}
                  className="pose-canvas"
                />
              </>
            )}

            <div className="camera-top-label">
              {currentScreen === 'lunge-camera' ? 'LUNGE IN PROGRESS' : 'SQUAT IN PROGRESS'}
            </div>
          </div>

          <div className={`workout-panel ${panelExpanded ? 'expanded' : ''}`}>
            <button
              className="panel-toggle"
              onClick={() => setPanelExpanded(!panelExpanded)}
              aria-label={panelExpanded ? 'Collapse workout panel' : 'Expand workout panel'}
            >
              {panelExpanded ? '⌄' : '⌃'}
            </button>

            <div className="panel-stats">
              <div className="workout-stat">
                <p>REPS</p>
                <span>{reps}</span>
              </div>
              <div className="workout-stat">
                <p>TIME</p>
                <span>
                  {Math.floor(workoutDuration / 60)}:
                  {String(workoutDuration % 60).padStart(2, '0')}
                </span>
              </div>
            </div>

            <p className="panel-exercise-name">
              {currentScreen === 'lunge-camera' ? 'Lunges' : 'Squats'}
            </p>

            {panelExpanded && (
              <div className="panel-details">
                <p className="panel-form-status">{formStatus}</p>
                {speedWarning && currentScreen === 'camera' && (
                  <p className="speed-warning">
                    Slow down! Control your squat to avoid counting extra reps.
                  </p>
                )}
                <p className="form-feedback">
                  Keep your full body visible and move with control.
                </p>
                <button
                  className="back-button"
                  onClick={() => {
                    workoutStartedRef.current = false;
                    setWorkoutStarted(false);
                    setReps(0);
                    setSpeedWarning(false);
                    setFormStatus('Waiting for hand raise');
                    setCurrentScreen(
                      currentScreen === 'lunge-camera'
                        ? 'lunge-instructions'
                        : 'instructions'
                    );
                  }}
                >
                  Back to Instructions
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : currentScreen === 'camera' ? (
      <>
        <div className="camera-workout">
          <div className="camera-container">
            <div className="camera-placeholder">
              {cameraError ? (
                <span>{cameraError}</span>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video"
                  />
                  <canvas
                    ref={canvasRef}
                    className="pose-canvas"
                  />
                </>
              )}

              <div className="camera-top-label">
                SQUAT IN PROGRESS
              </div>
            </div>

            <div className={`workout-panel ${panelExpanded ? 'expanded' : ''}`}>
              <button
                className="panel-toggle"
                onClick={() => setPanelExpanded(!panelExpanded)}
                aria-label={panelExpanded ? 'Collapse workout panel' : 'Expand workout panel'}
              >
                {panelExpanded ? '⌄' : '⌃'}
              </button>

              <div className="panel-stats">
                <div className="workout-stat">
                  <p>REPS</p>
                  <span>{reps}</span>
                </div>

                <div className="workout-stat">
                  <p>TIME</p>
                  <span>
                    {Math.floor(workoutDuration / 60)}:
                    {String(workoutDuration % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>

              <p className="panel-exercise-name">Squats</p>

              {panelExpanded && (
                <div className="panel-details">
                  <p className="panel-form-status">{formStatus}</p>

                  {speedWarning && (
                    <p className="speed-warning">
                      Slow down! Control your squat to avoid counting extra reps.
                    </p>
                  )}

                  <div className="angle-readings">
                    <p>Knee Angle: {kneeAngle?.toFixed(1) ?? '--'}°</p>
                    <p>Hip Angle: {hipAngle?.toFixed(1) ?? '--'}°</p>
                    <p>Back Lean: {backAngleValue?.toFixed(1) ?? '--'}°</p>
                  </div>

                  <p className="form-feedback">
                    Keep your full body visible and move with control.
                  </p>

                  <button
                    className="back-button"
                    onClick={() => {
                      workoutStartedRef.current = false;
                      setWorkoutStarted(false);
                      squatPhaseRef.current = 'standing';
                      setFormStatus('Waiting for hand raise');
                      uprightFramesRef.current = 0;
                      setReps(0);
                      setWorkoutFinished(false);
                      setSpeedWarning(false);
                      stopGestureFramesRef.current = 0;
                      setCurrentScreen('instructions');
                    }}
                  >
                    Back to Instructions
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    ) : currentScreen === 'lunge-instructions' ? (




      
        <>
          <h1>Lunge</h1>
          <p>Get ready to practice your lunge form.</p>

          <div className="instruction-card">
            <h2>Before you start</h2>
            <p>Stand upright with your feet about hip-width apart.</p>
            <p>Face the camera with your side.</p>
            <p>Raise your right hand for 5 seconds to start.</p>
            <p>Raise your left hand for 5 seconds to finish.</p>
            <p>Keep your torso steady, then push through your front foot to return to standing.</p>
          </div>

          <button
            className="start-button"
            onClick={() => {
              setFormStatus('Waiting for hand raise');
              setWorkoutFinished(false);
              setWorkoutStarted(false);
              workoutStartedRef.current = false;
              squatPhaseRef.current = 'standing';
              uprightFramesRef.current = 0;
              stopGestureFramesRef.current = 0;
              setReps(0);
              workoutStartTimeRef.current = null;
              setWorkoutDuration(0);
              setCurrentScreen('lunge-camera');
            }}
          >
            Start Lunge
          </button>

          <button
            className="back-button"
            onClick={() => setCurrentScreen('exercises')}
          >
            Back to Exercises
          </button>
        </>
      ) : (
        <>
          <h1>Squat</h1>
          <p>Get ready to practice your form.</p>

          <div className="instruction-card">
            <h2>Before you start</h2>
            <p>
              Stand with your feet about shoulder-width apart.
            </p>
            <p>
              Keep your chest up and your back in a comfortable,
              neutral position.
            </p>
            <p>
              Bend your hips and knees to lower yourself, then
              stand back up with control.
            </p>
            <p>Face the camera with your side.</p>
            <p>Raise your right hand for 5 seconds to start.</p>
            <p>Raise your left hand for 5 seconds to finish.</p>
          </div>

          <button
            className="start-button"
            onClick={() => {
                setFormStatus('Waiting for hand raise');
                setWorkoutFinished(false);
                setWorkoutStarted(false);
                workoutStartedRef.current = false;
                squatPhaseRef.current = 'standing';
                uprightFramesRef.current = 0;
                stopGestureFramesRef.current = 0;
                setReps(0);
                workoutStartTimeRef.current = null;
                setWorkoutDuration(0);
                setCurrentScreen('camera');
            }}
          >
            Start Squat
          </button>

          <button
            className="back-button"
            onClick={() => setCurrentScreen('exercises')}
          >
            Back to Exercises
          </button>
        </>
          )}
          <BottomNavigation
            currentScreen={currentScreen}
            setCurrentScreen={setCurrentScreen}
         />
    </main>
  );
}

export default App;