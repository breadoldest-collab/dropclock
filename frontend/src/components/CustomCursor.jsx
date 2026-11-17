import { useEffect, useState } from 'react';

function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [target, setTarget] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setTarget({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      const targetEl = e.target.closest('a, button, input, [role="button"], .interactive');
      setIsHovered(!!targetEl);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isVisible]);

  // Smooth lerp (0.2)
  useEffect(() => {
    let animId;
    const lerp = () => {
      setPos((prev) => ({
        x: prev.x + (target.x - prev.x) * 0.2,
        y: prev.y + (target.y - prev.y) * 0.2,
      }));
      animId = requestAnimationFrame(lerp);
    };
    animId = requestAnimationFrame(lerp);
    return () => cancelAnimationFrame(animId);
  }, [target]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none rounded-full z-[10000] transition-transform duration-100 ease-out hidden md:block"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '32px',
        height: '32px',
        backgroundColor: '#FFFFFF',
        mixBlendMode: 'difference',
        transform: `translate(-50%, -50%) scale(${isHovered ? 2.5 : 1})`,
      }}
    />
  );
}

export default CustomCursor;

