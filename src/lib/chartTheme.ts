// Chart color roles — validated categorical / sequential / diverging / status
// palette (see dataviz skill: references/palette.md). Light-surface values only;
// this dashboard ships a single (light) theme.

export const chartColors = {
  surface: "#fcfcfb",
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  muted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",

  // Sequential blue ramp — used for the ordinal onboarding funnel (stage 1 -> 8)
  sequential: [
    "#86b6ef", // step 250 — lightest allowed for ordinal (clears 2:1)
    "#6da7ec",
    "#5598e7",
    "#3987e5",
    "#2a78d6",
    "#256abf",
    "#1c5cab",
    "#184f95",
  ],

  // Status palette — fixed, never themed
  status: {
    good: "#0ca30c",
    warning: "#fab219",
    serious: "#ec835a",
    critical: "#d03b3b",
  },

  // Diverging blue <-> red, neutral gray midpoint — payroll variance (+/-)
  diverging: {
    positive: "#2a78d6",
    negative: "#d03b3b",
    neutral: "#f0efec",
  },

  categorical: {
    blue: "#2a78d6",
    orange: "#eb6834",
    aqua: "#1baf7a",
    yellow: "#eda100",
    magenta: "#e87ba4",
    green: "#008300",
    violet: "#4a3aa7",
    red: "#e34948",
  },
};

export const statusColor = (status: string): string => {
  switch (status) {
    case "On Track":
      return chartColors.status.good;
    case "At Risk":
      return chartColors.status.warning;
    case "Blocked":
      return chartColors.status.critical;
    case "Completed":
      return chartColors.categorical.blue;
    case "Reconciled":
      return chartColors.status.good;
    case "Under Review":
      return chartColors.status.warning;
    case "Unreconciled":
      return chartColors.status.critical;
    case "SLA Breach":
      return chartColors.status.critical;
    default:
      return chartColors.muted;
  }
};

export const severityColor = (severity: string): string => {
  switch (severity) {
    case "Critical":
      return chartColors.status.critical;
    case "High":
      return chartColors.status.serious;
    case "Medium":
      return chartColors.status.warning;
    default:
      return chartColors.muted;
  }
};
