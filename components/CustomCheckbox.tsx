'use client';

import { useEffect, useRef, useState } from 'react';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: () => void;
}

export default function CustomCheckbox({ checked, onChange }: CustomCheckboxProps) {
  const checkPathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);
  const userClickedRef = useRef(false);

  useEffect(() => {
    if (checkPathRef.current) {
      setPathLength(checkPathRef.current.getTotalLength());
    }
  }, []);

  useEffect(() => {
    if (userClickedRef.current) {
      const timer = setTimeout(() => {
        userClickedRef.current = false;
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [checked]);

  const handleInteraction = () => {
    userClickedRef.current = true;
    onChange();
  };

  return (
    <div
      className="custom-checkbox-wrapper"
      onClick={handleInteraction}
      role="checkbox"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleInteraction();
        }
      }}
      aria-checked={checked}
      aria-label={checked ? 'Marcar como no completada' : 'Marcar como completada'}
    >
      <div className="custom-checkbox-square">
        {/* Cuadro recto */}
        <svg
          className="custom-checkbox-box"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="3"
            y="3"
            width="26"
            height="26"
            stroke="#d1d5db"
            strokeWidth="1"
            fill="none"
          />
        </svg>
        
        {/* Check garabateado que sobresale */}
        <svg
          className="custom-checkbox-check"
          viewBox="0 0 52 52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            ref={checkPathRef}
            d="M6 30 
               Q 12 38, 18 40
               Q 22 41, 26 34
               Q 32 24, 38 16
               Q 42 10, 48 4"
            stroke="#1f2937"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: pathLength || 80,
              strokeDashoffset: checked ? 0 : (pathLength || 80),
              transition: userClickedRef.current
                ? (checked
                    ? 'stroke-dashoffset 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                    : 'stroke-dashoffset 0.15s ease-in')
                : 'none',
            }}
          />
        </svg>
      </div>
    </div>
  );
}