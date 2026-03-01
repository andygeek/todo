'use client';

import { useEffect, useRef, useState } from 'react';

interface UndoNotificationProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number; // en milisegundos
}

export default function UndoNotification({
  message,
  onUndo,
  onDismiss,
  duration = 5000
}: UndoNotificationProps) {
  const [progress, setProgress] = useState(100);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const percentage = (remaining / duration) * 100;

      setProgress(percentage);

      if (remaining <= 0) {
        clearInterval(interval);
        onDismissRef.current();
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="fixed bottom-6 left-6 z-50 bg-black text-white px-6 py-4 rounded-lg shadow-lg min-w-[200px]">
      <div className="flex items-center gap-4">
        <span className="text-lg">{message}</span>
        <button
          onClick={onUndo}
          className="text-white underline hover:no-underline font-medium"
        >
          Deshacer
        </button>
      </div>
      <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

