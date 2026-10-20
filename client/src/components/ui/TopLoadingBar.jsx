import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { activity } from "../../api/activity";

/**
 * Thin bar at the very top of the window while anything is loading (API calls, route
 * chunks). It waits 200 ms before showing so quick actions don't flicker, creeps
 * towards 90% while work continues, then completes and fades out.
 */
const TopLoadingBar = () => {
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const showTimer = useRef(null);
  const creep = useRef(null);

  useEffect(() => activity.subscribe((n) => setBusy(n > 0)), []);

  useEffect(() => {
    clearTimeout(showTimer.current);
    if (busy) {
      showTimer.current = setTimeout(() => {
        setVisible(true);
        setWidth(12);
        clearInterval(creep.current);
        creep.current = setInterval(() => setWidth((w) => (w < 90 ? w + (90 - w) * 0.08 : w)), 250);
      }, 200);
    } else if (visible) {
      clearInterval(creep.current);
      setWidth(100);
      showTimer.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 320);
    }
    return () => clearTimeout(showTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  useEffect(() => () => clearInterval(creep.current), []);

  return (
    <Box aria-hidden sx={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 2000, pointerEvents: "none", opacity: visible ? 1 : 0, transition: "opacity .25s ease" }}>
      <Box sx={{ height: "100%", width: `${width}%`, backgroundColor: "var(--accent)", boxShadow: "0 0 8px var(--accent-ring)", transition: "width .25s ease" }} />
    </Box>
  );
};

/** Suspense fallback that also drives the top bar while a lazy route chunk loads. */
export const RouteActivity = ({ children }) => {
  useEffect(() => activity.start(), []);
  return children ?? null;
};

export default TopLoadingBar;
