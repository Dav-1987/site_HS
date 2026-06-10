import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../lib/gsap.js';

/**
 * Scroll-triggered reveal. Wraps content and fades/slides it in once.
 * - Default: animates the wrapper itself.
 * - `stagger`: animates direct children in sequence (for grids/lists).
 * Respects `prefers-reduced-motion`. Runs in useLayoutEffect to set the
 * initial hidden state before paint (no flash).
 */
export default function Reveal({
  children,
  as: Tag = 'div',
  className = '',
  delay = 0,
  y = 28,
  stagger = false,
  start = 'top 85%',
  ...rest
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = stagger ? Array.from(el.children) : el;

    if (reduce) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.set(targets, { opacity: 0, y });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        delay,
        stagger: stagger ? 0.1 : 0,
        scrollTrigger: { trigger: el, start },
      });
    }, ref);

    return () => ctx.revert();
  }, [delay, y, stagger, start]);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
