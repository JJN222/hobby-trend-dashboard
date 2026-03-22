import React from "react";

const CONFIG = {
  rising: { label: "RISING", color: "#2d6a4f", border: "1.5px solid #2d6a4f" },
  stable: { label: "STABLE", color: "#999", border: "1px solid #ddd" },
  declining: { label: "DECLINING", color: "#c0392b", border: "1px solid #e8c4c0" },
};

export default function DirectionTag({ direction }) {
  const c = CONFIG[direction] || CONFIG.stable;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.1em",
        color: c.color,
        borderBottom: c.border,
        paddingBottom: 2,
      }}
    >
      {c.label}
    </span>
  );
}
