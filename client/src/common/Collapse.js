import { useEffect, useState, useRef } from "react";

export function Collapse({ open, className, children, ...props }) {
  const ref = useRef();
  const [scrollHeight, setScrollHeight] = useState(0);
  useEffect(() => {
    setScrollHeight(ref.current?.scrollHeight || 0);
  }, []);
  return (
    <div
      ref={ref}
      style={{
        overflow: "hidden",
        transitionProperty: "max-height",
        transitionDuration: "300ms",
        maxHeight: open ? scrollHeight || "max-content" : 0,
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
