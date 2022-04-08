import { useEffect, useState, useRef } from "react";

export function Collapse({ open, className, children, ...props }) {
  const ref = useRef();

  // start with height set to max content if initial value of open prop is true
  // in order to avoid opening animation when component is mounted.
  const [scrollHeight, setScrollHeight] = useState(() =>
    open ? "max-content" : 0
  );

  useEffect(() => {
    setScrollHeight(ref.current?.scrollHeight || 0);
  }, []);

  const maxHeight = open ? scrollHeight : 0;

  return (
    <div
      ref={ref}
      style={{
        overflow: "hidden",
        transitionProperty: "max-height",
        transitionDuration: "300ms",
        maxHeight,
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
