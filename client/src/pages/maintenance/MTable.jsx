import { Box } from "@mui/material";
import SkeletonRows from "../../components/ui/SkeletonRows";

/**
 * Plain table used across the maintenance pages.
 * columns: [{ key, label, align, width, render: (row) => node }]
 */
const MTable = ({ columns, rows, onRowClick, loading = false, empty = null, rowKey = (r) => r._id, ariaLabel }) => {
  if (loading && !rows?.length) return <SkeletonRows rows={6} />;
  if (!rows?.length) return empty;
  return (
    <Box sx={{ overflowX: "auto", opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
      <Box
        component="table"
        aria-label={ariaLabel}
        sx={{
          width: "100%", borderCollapse: "collapse", fontSize: 13,
          "& th, & td": { px: 1.5, py: 1.1, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", textAlign: "left" },
          "& th": { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", backgroundColor: "var(--surface-subtle)" },
          "& tbody tr:hover": onRowClick ? { backgroundColor: "var(--surface-hover)" } : undefined,
          "& tbody tr:last-of-type td": { borderBottom: 0 },
        }}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <Box component="th" key={c.key} scope="col" sx={{ textAlign: `${c.align || "left"} !important`, width: c.width }}>
                {c.label}
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Box
              component="tr"
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(r) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              sx={{ cursor: onRowClick ? "pointer" : "default", "&:focus-visible": { outline: "2px solid var(--accent)", outlineOffset: -2 } }}
            >
              {columns.map((c) => (
                <Box component="td" key={c.key} sx={{ textAlign: `${c.align || "left"} !important`, fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>
                  {c.render ? c.render(r) : r[c.key] ?? "—"}
                </Box>
              ))}
            </Box>
          ))}
        </tbody>
      </Box>
    </Box>
  );
};

export default MTable;
