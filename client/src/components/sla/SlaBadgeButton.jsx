import { useEffect, useState } from "react";
import { Box, Button } from "@mui/material";
import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";
import Badge from "../ui/Badge";
import SlaDialog from "./SlaDialog";
import { slaApi } from "../../api/slaApi";

/**
 * Clickable badge button that shows ticket SLA status and opens SlaDialog on click.
 */
const SlaBadgeButton = ({ target, title, slid, size = "small" }) => {
  const [sla, setSla] = useState(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!target?.kind || !target?.id) return;
    try {
      const data = await slaApi.forTarget(target.kind, target.id);
      setSla(data);
    } catch {
      setSla(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.kind, target?.id]);

  return (
    <>
      {sla ? (
        <Box
          component="button"
          type="button"
          onClick={() => setOpen(true)}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            border: 0,
            background: "none",
            p: 0,
            cursor: "pointer",
            font: "inherit",
          }}
        >
          {sla.computedStatus === "breached" ? (
            <Badge tone="danger" sx={{ cursor: "pointer", "&:hover": { opacity: 0.85 } }}>
              SLA Breached ({Math.abs(sla.hoursRemaining)}h)
            </Badge>
          ) : sla.isAboutToBreach ? (
            <Badge tone="warning" sx={{ cursor: "pointer", "&:hover": { opacity: 0.85 } }}>
              SLA Warning ({sla.hoursRemaining}h)
            </Badge>
          ) : sla.computedStatus === "met" ? (
            <Badge tone="success" sx={{ cursor: "pointer", "&:hover": { opacity: 0.85 } }}>
              SLA Met
            </Badge>
          ) : (
            <Badge tone="info" sx={{ cursor: "pointer", "&:hover": { opacity: 0.85 } }}>
              SLA: {sla.hoursRemaining}h left
            </Badge>
          )}
        </Box>
      ) : (
        <Button
          size={size}
          variant="outlined"
          startIcon={<AccessTimeOutlined sx={{ fontSize: 16 }} />}
          onClick={() => setOpen(true)}
          sx={{ textTransform: "none", fontSize: 12, height: 28, borderColor: "var(--border)" }}
        >
          SLA
        </Button>
      )}

      {open && (
        <SlaDialog
          open={open}
          onClose={() => setOpen(false)}
          target={target}
          title={title}
          slid={slid}
          onUpdated={load}
        />
      )}
    </>
  );
};

export default SlaBadgeButton;
