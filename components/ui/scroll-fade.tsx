"use client";

import { useCallback, useEffect, useRef, useState, type HTMLAttributes } from "react";

// A horizontally scrolling area with no scrollbar. Soft fades on the edges show
// there is more to scroll to: the right one while content is hidden on the right,
// the left one once scrolled. When everything fits, no fade shows at all.
// Extra props (role, onClick, ...) go to the scrolling element itself.
export function ScrollFade({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdge((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    // Content can change size too (rows load, a session expands), not just the window.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [update]);

  const fade = "pointer-events-none absolute inset-y-0 w-10 from-card to-transparent transition-opacity duration-200";
  return (
    <div className="relative">
      <div ref={ref} onScroll={update} {...rest} className={`overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
        {children}
      </div>
      <span aria-hidden="true" className={`${fade} left-0 bg-gradient-to-r ${edge.left ? "opacity-100" : "opacity-0"}`} />
      <span aria-hidden="true" className={`${fade} right-0 bg-gradient-to-l ${edge.right ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
