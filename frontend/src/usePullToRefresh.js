import { useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD = 72;
const MAX_PULL = 104;

export function usePullToRefresh({ onRefresh, disabled = false }) {
  const start = useRef(null);
  const distanceRef = useRef(0);
  const [distance, setDistance] = useState(0);
  const [status, setStatus] = useState('idle');

  const refresh = useCallback(async () => {
    if (status === 'loading') return;
    setStatus('loading');
    setDistance(56);
    try {
      const succeeded = await onRefresh();
      setStatus(succeeded === false ? 'error' : 'success');
    } catch {
      setStatus('error');
    }
    setDistance(0);
    window.setTimeout(() => setStatus('idle'), 1400);
  }, [onRefresh, status]);

  useEffect(() => {
    if (disabled) return undefined;
    const interactive = (target) => target instanceof Element && Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'));
    const onStart = (event) => {
      if (window.scrollY !== 0 || interactive(event.target) || event.touches.length !== 1) return;
      start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const onMove = (event) => {
      if (!start.current || window.scrollY !== 0) return;
      const dx = event.touches[0].clientX - start.current.x;
      const dy = event.touches[0].clientY - start.current.y;
      if (dy <= 0 || Math.abs(dx) > dy) {
        start.current = null;
        setDistance(0);
        setStatus('idle');
        return;
      }
      if (dy > 8) event.preventDefault();
      const nextDistance = Math.min(MAX_PULL, dy * 0.55);
      setDistance(nextDistance);
      distanceRef.current = nextDistance;
      setStatus(nextDistance >= THRESHOLD ? 'ready' : 'pulling');
    };
    const onEnd = () => {
      if (!start.current) return;
      start.current = null;
      if (distanceRef.current >= THRESHOLD) refresh();
      else {
        setDistance(0);
        setStatus('idle');
      }
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [disabled, refresh]);

  return { distance, status };
}

export const pullStatusLabel = {
  idle: '',
  pulling: 'ลากลงเพื่อรีเฟรช',
  ready: 'ปล่อยเพื่อรีเฟรช',
  loading: 'กำลังโหลดข้อมูลใหม่',
  success: 'อัปเดตข้อมูลแล้ว',
  error: 'อัปเดตไม่สำเร็จ ลองอีกครั้ง',
};
