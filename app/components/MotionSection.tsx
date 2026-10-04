import {useEffect, useRef, type ReactNode} from 'react';

export function MotionSection({
  children,
  className,
  labelledBy,
}: {
  children: ReactNode;
  className: string;
  labelledBy: string;
}) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = root.current;
    if (!section || !('IntersectionObserver' in window)) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;

    const setup = () => {
      observer?.disconnect();
      section.removeAttribute('data-motion-fallback');
      section.querySelectorAll('[data-motion-item]').forEach((item) => {
        item.removeAttribute('data-visible');
      });
      section.style.removeProperty('--timeline-progress');
      if (media.matches || CSS.supports('animation-timeline: view()')) return;

      // Old browsers animate each section as it crosses the viewport.
      section.setAttribute('data-motion-fallback', '');
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.setAttribute('data-visible', '');
              const steps = section.querySelectorAll('.timeline-steps li');
              const index = Array.from(steps).indexOf(entry.target);
              if (index >= 0) {
                const progress = Number(
                  section.style.getPropertyValue('--timeline-progress'),
                );
                section.style.setProperty(
                  '--timeline-progress',
                  String(Math.max(progress, (index + 1) / steps.length)),
                );
              }
            }
          });
        },
        {threshold: 0.2},
      );
      section.querySelectorAll('[data-motion-item]').forEach((item) => {
        observer?.observe(item);
      });
    };

    setup();
    media.addEventListener('change', setup);
    return () => {
      observer?.disconnect();
      media.removeEventListener('change', setup);
    };
  }, []);

  return (
    <section ref={root} className={className} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
