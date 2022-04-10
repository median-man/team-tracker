import { useEffect, useState } from "react";

export function Fade({ children }) {
  const [show, setShow] = useState(false);
  const [contents, setContents] = useState(children);

  useEffect(() => {
    if (contents !== children) {
      setShow(false);
    } else if (!show) {
      setShow(true);
    }
  }, [contents, children, show]);

  const handleTransitionEnd = (event) => {
    // if this event was triggered by the end of the fade out transition, update
    // the content to show new children.
    if (event.currentTarget === event.target && !show) {
      setContents(children);
      setShow(true);
    }
  };

  return (
    <div
      className={`transition-opacity duration-300 ${
        show ? "opacity-1 ease-in" : "opacity-0 ease-out"
      }`}
      onTransitionEnd={handleTransitionEnd}
      data-testid="fade"
    >
      {contents}
    </div>
  );
}
