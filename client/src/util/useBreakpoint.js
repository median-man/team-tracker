import defaultTheme from "tailwindcss/defaultTheme";
import { useEffect, useState, useRef } from "react";

const createMediaQueryList = (breakpoint) =>
  window.matchMedia(`(min-width: ${defaultTheme.screens[breakpoint]})`);

/**
 * Return boolean for current screenwidth >= given breakpoint.
 *
 * @param {string} breakpoint string
 * @returns boolean
 */
export const useBreakpoint = (breakpoint) => {
  const [matches, setMatches] = useState(
    () => createMediaQueryList(breakpoint).matches
  );
  if (!defaultTheme.screens[breakpoint]) {
    throw new Error(`Invalid breakpoint received: ${breakpoint}`);
  }
  useEffect(() => {
    const mediaQueryList = createMediaQueryList(breakpoint);
    const handleChange = (event) => setMatches(event.matches);
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, [breakpoint]);
  return matches;
};
