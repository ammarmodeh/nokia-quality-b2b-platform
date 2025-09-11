import { useState, useEffect } from 'react';

const environment = import.meta.env.VITE_ENVIRONMENT;

export const Timer = ({ timeLimit = 60, onTimeUp, teamId }) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    // Check sessionStorage for existing timer state
    const savedTime = sessionStorage.getItem('quizTimer');
    return savedTime !== null ? parseInt(savedTime, 10) : timeLimit;
  });

  useEffect(() => {
    // Function to toggle canTakeQuiz to false (synchronous for beforeunload)
    const toggleQuizPermission = () => {
      if (!teamId) {
        console.warn('No teamId provided to toggle canTakeQuiz');
        return;
      }
      // Use XMLHttpRequest for synchronous call in beforeunload
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', `${environment === 'development' ? 'http://localhost:5000' : 'https://nokia-quality-b2b-platform.vercel.app'}/api/field-teams/toggle-quiz-permission/${teamId}`, false); // false for synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ canTakeQuiz: false }));
      if (xhr.status !== 200) {
        console.error('Failed to toggle quiz permission:', xhr.statusText);
      } else {
        console.log(`canTakeQuiz set to false for team ${teamId}`);
      }
    };

    // Prevent page reload or tab closure
    const handleBeforeUnload = (event) => {
      // Call toggleQuizPermission synchronously
      toggleQuizPermission();
      // Set returnValue to trigger browser's native prompt
      event.preventDefault();
      event.returnValue = 'Are you sure you want to leave? Your quiz progress will be lost.';
      return event.returnValue; // Required for some browsers
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Save timeLeft to sessionStorage on every change
    sessionStorage.setItem('quizTimer', timeLeft);

    // Timer logic
    if (timeLeft === 0) {
      onTimeUp();
      sessionStorage.removeItem('quizTimer'); // Clear timer on completion
      toggleQuizPermission(); // Set canTakeQuiz to false on timeout
      return;
    }

    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [timeLeft, onTimeUp, teamId]);

  // Prevent common screenshot and dev tools shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Block PrintScreen, Ctrl+Shift+I, Ctrl+Shift+C, F12
      if (
        event.key === 'PrintScreen' ||
        (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'C')) ||
        event.key === 'F12'
      ) {
        event.preventDefault();
        alert('Screenshots and developer tools are disabled during the quiz.');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Disable right-click context menu
    const handleContextMenu = (event) => {
      event.preventDefault();
      alert('Right-click is disabled during the quiz.');
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{ color: 'red', textAlign: 'end', position: 'relative' }}>
      Time Left: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
      {/* Optional: Dynamic watermark */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.2,
          pointerEvents: 'none',
          color: 'white',
          textAlign: 'center',
          fontSize: '20px',
          transform: 'rotate(-45deg)',
          userSelect: 'none'
        }}
      >
        Quiz in Progress - {sessionStorage.getItem('teamName') || 'User'}
      </div>
    </div>
  );
};