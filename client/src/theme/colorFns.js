import {
  alpha as muiAlpha,
  darken as muiDarken,
  lighten as muiLighten,
  emphasize as muiEmphasize,
} from "@mui/material/styles";

// Drop-in replacements for MUI's colour helpers that also accept design
// tokens (`var(--x)`) and other CSS colours MUI can't parse, using color-mix().
const isCssOnly = (c) => typeof c === "string" && /^(var\(|color-mix\(|currentColor|transparent)/i.test(c.trim());
const pct = (n) => `${Math.round(Math.min(Math.max(n, 0), 1) * 1000) / 10}%`;

export const alpha = (color, value) =>
  isCssOnly(color) ? `color-mix(in srgb, ${color} ${pct(value)}, transparent)` : muiAlpha(color, value);

export const darken = (color, coefficient) =>
  isCssOnly(color) ? `color-mix(in srgb, ${color} ${pct(1 - coefficient)}, black)` : muiDarken(color, coefficient);

export const lighten = (color, coefficient) =>
  isCssOnly(color) ? `color-mix(in srgb, ${color} ${pct(1 - coefficient)}, white)` : muiLighten(color, coefficient);

export const emphasize = (color, coefficient = 0.15) =>
  isCssOnly(color) ? `color-mix(in srgb, ${color} ${pct(1 - coefficient)}, var(--text))` : muiEmphasize(color, coefficient);
