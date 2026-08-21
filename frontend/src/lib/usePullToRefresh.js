import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 86;
const MAX_DISTANCE = 122;
const RESISTANCE = 0.46;
const RESET_DELAY = 900;
const INTERACTIVE_SELECTOR = 'button, input, select, textarea, label, a, [role="button"], [contenteditable="true"]';

export function usePullToRefresh({ disabled = false, onRefresh }) {
  const [status, setStatus] = useState('idle');
  const [distance, setDistance] = useState(0);
  const disabledRef = useRef(disabled);
  const onRefreshRef = useRef(onRefresh);
  const trackingRef = useRef(false);
  const refreshingRef = useRef(false);
  const startYRef = useRef(0);
  const distanceRef = useRef(0);
  const resetTimerRef = useRef(null);
  const reducedMotionRef = useRef(prefersReducedMotion());

  useEffect(() => {
    disabledRef.current = disabled;
    if (disabled && !refreshingRef.current) resetPullState();
  }, [disabled]);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const updateMotionPreference = () => {
      reducedMotionRef.current = media.matches;
    };
    updateMotionPreference();
    media.addEventListener?.('change', updateMotionPreference);
    return () => media.removeEventListener?.('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    function handleTouchStart(event) {
      if (
        disabledRef.current ||
        refreshingRef.current ||
        window.scrollY > 0 ||
        event.touches.length !== 1 ||
        isInteractiveTarget(event.target)
      ) {
        trackingRef.current = false;
        return;
      }

      window.clearTimeout(resetTimerRef.current);
      trackingRef.current = true;
      startYRef.current = event.touches[0].clientY;
      distanceRef.current = 0;
      setDistance(0);
      setStatus('idle');
    }

    function handleTouchMove(event) {
      if (!trackingRef.current || disabledRef.current || event.touches.length !== 1) return;

      const delta = event.touches[0].clientY - startYRef.current;
      if (delta <= 0 || window.scrollY > 0) {
        trackingRef.current = false;
        resetPullState();
        return;
      }

      const nextDistance = Math.min(MAX_DISTANCE, delta * RESISTANCE);
      distanceRef.current = nextDistance;
      setDistance(nextDistance);
      setStatus(nextDistance >= THRESHOLD ? 'ready' : 'pulling');
      if (nextDistance > 8) event.preventDefault();
    }

    async function handleTouchEnd() {
      if (!trackingRef.current) return;

      trackingRef.current = false;
      const shouldRefresh = distanceRef.current >= THRESHOLD && !disabledRef.current;
      if (!shouldRefresh) {
        resetPullState();
        return;
      }

      refreshingRef.current = true;
      setStatus('refreshing');
      setDistance(reducedMotionRef.current ? 0 : THRESHOLD);
      try {
        await onRefreshRef.current?.();
        setStatus('complete');
      } catch {
        setStatus('error');
      } finally {
        refreshingRef.current = false;
        setDistance(reducedMotionRef.current ? 0 : 42);
        resetTimerRef.current = window.setTimeout(resetPullState, RESET_DELAY);
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', resetPullState, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', resetPullState);
      window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  function resetPullState() {
    trackingRef.current = false;
    distanceRef.current = 0;
    setDistance(0);
    setStatus('idle');
  }

  return {
    distance,
    progress: Math.min(1, distance / THRESHOLD),
    status,
  };
}

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
