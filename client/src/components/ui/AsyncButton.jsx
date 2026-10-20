import { useEffect, useRef, useState } from "react";
import { Button } from "@mui/material";

/**
 * Button for actions that talk to the server. If onClick returns a promise, the button
 * shows a spinner (and optional `pendingLabel`) and ignores further clicks until it
 * settles, so nothing is submitted twice. `loading` can also be driven from outside
 * (e.g. react-hook-form's isSubmitting for type="submit" buttons).
 */
const AsyncButton = ({ onClick, loading = false, pendingLabel, children, startIcon, ...rest }) => {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const running = useRef(false);
  useEffect(() => () => { mounted.current = false; }, []);

  const handle = async (e) => {
    if (running.current || loading) return;
    const out = onClick?.(e);
    if (out && typeof out.then === "function") {
      running.current = true;
      setBusy(true);
      try {
        await out;
      } finally {
        running.current = false;
        if (mounted.current) setBusy(false);
      }
    }
  };

  const pending = busy || loading;
  return (
    <Button {...rest} onClick={onClick ? handle : undefined} loading={pending} loadingPosition="start" startIcon={startIcon || <span />}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
};

export default AsyncButton;
