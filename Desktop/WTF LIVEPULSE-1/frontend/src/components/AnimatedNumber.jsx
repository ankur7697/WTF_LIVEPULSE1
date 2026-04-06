import { useEffect, useRef, useState } from 'react';

function AnimatedNumber({ value, formatter = (nextValue) => nextValue, duration = 420, className = '' }) {
  const [displayValue, setDisplayValue] = useState(value || 0);
  const previousValue = useRef(value || 0);

  useEffect(() => {
    const from = previousValue.current || 0;
    const to = Number(value || 0);
    const start = performance.now();
    let rafId = 0;

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (to - from) * eased;
      setDisplayValue(next);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        previousValue.current = to;
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);

  return <span className={className}>{formatter(displayValue)}</span>;
}

export {
  AnimatedNumber,
};

