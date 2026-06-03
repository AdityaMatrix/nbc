// Shared theme definitions and application logic
// Used by both DashboardLayout and SettingsPage
// Bright/light themes only

export const themes = {
  aurora: {
    name: "Aurora Borealis",
    description: "Northern lights magic",
    preview: "linear-gradient(135deg, #00C9FF 0%, #92FE9D 50%, #F0F 100%)",
    primary: "#00C9FF",
    secondary: "#92FE9D",
    accent: "#FF00FF",
    sidebar: "#0C1445",
    sidebarText: "#92FE9D",
    background: "#F0F9FF",
    card: "#FFFFFF",
    text: "#1E3A5F",
    muted: "#64748B",
    border: "#C7E8FF",
    success: "#00D68F",
    warning: "#FFAA00",
    error: "#FF3D71"
  },
  cosmicDream: {
    name: "Cosmic Dream",
    description: "Deep space elegance",
    preview: "linear-gradient(135deg, #667EEA 0%, #764BA2 50%, #F093FB 100%)",
    primary: "#667EEA",
    secondary: "#764BA2",
    accent: "#F093FB",
    sidebar: "#1A1A2E",
    sidebarText: "#F093FB",
    background: "#F5F3FF",
    card: "#FFFFFF",
    text: "#2D2A4A",
    muted: "#6B7280",
    border: "#DDD6FE",
    success: "#10B981",
    warning: "#FBBF24",
    error: "#EF4444"
  },
  mintFresh: {
    name: "Mint Fresh",
    description: "Cool mint breeze",
    preview: "linear-gradient(135deg, #11998E 0%, #38EF7D 100%)",
    primary: "#11998E",
    secondary: "#38EF7D",
    accent: "#00D4FF",
    sidebar: "#0D2818",
    sidebarText: "#38EF7D",
    background: "#F0FDF4",
    card: "#FFFFFF",
    text: "#064E3B",
    muted: "#6B7280",
    border: "#A7F3D0",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444"
  },
  sunsetGlow: {
    name: "Sunset Glow",
    description: "Warm golden hour",
    preview: "linear-gradient(135deg, #F97316 0%, #EC4899 50%, #8B5CF6 100%)",
    primary: "#F97316",
    secondary: "#EC4899",
    accent: "#8B5CF6",
    sidebar: "#1C1917",
    sidebarText: "#F97316",
    background: "#FFFBEB",
    card: "#FFFFFF",
    text: "#451A03",
    muted: "#78716C",
    border: "#FDE68A",
    success: "#10B981",
    warning: "#F97316",
    error: "#EF4444"
  },
  oceanDepth: {
    name: "Ocean Depth",
    description: "Deep sea mystery",
    preview: "linear-gradient(135deg, #0077B6 0%, #00B4D8 50%, #90E0EF 100%)",
    primary: "#0077B6",
    secondary: "#00B4D8",
    accent: "#90E0EF",
    sidebar: "#03045E",
    sidebarText: "#90E0EF",
    background: "#CAF0F8",
    card: "#FFFFFF",
    text: "#03045E",
    muted: "#64748B",
    border: "#ADE8F4",
    success: "#00B4D8",
    warning: "#F59E0B",
    error: "#EF4444"
  },
  glacierIce: {
    name: "Glacier Ice",
    description: "Crystal clear blue",
    preview: "linear-gradient(135deg, #E0F7FA 0%, #4DD0E1 50%, #00ACC1 100%)",
    primary: "#00ACC1",
    secondary: "#4DD0E1",
    accent: "#00E5FF",
    sidebar: "#004D40",
    sidebarText: "#4DD0E1",
    background: "#E0F7FA",
    card: "#FFFFFF",
    text: "#004D40",
    muted: "#607D8B",
    border: "#80DEEA",
    success: "#00E676",
    warning: "#FFC107",
    error: "#FF5252"
  },
  royalViolet: {
    name: "Royal Violet",
    description: "Luxurious purple",
    preview: "linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)",
    primary: "#4A00E0",
    secondary: "#8E2DE2",
    accent: "#DA22FF",
    sidebar: "#1A0033",
    sidebarText: "#DA22FF",
    background: "#F5F3FF",
    card: "#FFFFFF",
    text: "#2D1B4E",
    muted: "#6B7280",
    border: "#C4B5FD",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444"
  },
  electricLime: {
    name: "Electric Lime",
    description: "Energetic green spark",
    preview: "linear-gradient(135deg, #C6FF00 0%, #00E676 100%)",
    primary: "#00E676",
    secondary: "#C6FF00",
    accent: "#00BCD4",
    sidebar: "#1B2814",
    sidebarText: "#C6FF00",
    background: "#F1F8E9",
    card: "#FFFFFF",
    text: "#1B5E20",
    muted: "#689F38",
    border: "#C5E1A5",
    success: "#00E676",
    warning: "#FFEB3B",
    error: "#FF5722"
  },
  industrial: {
    name: "Industrial Rust",
    description: "Manufacturing strength",
    preview: "linear-gradient(135deg, #C2410C 0%, #9A3412 100%)",
    primary: "#C2410C",
    secondary: "#9A3412",
    accent: "#EA580C",
    sidebar: "#334155",
    sidebarText: "#E2E8F0",
    background: "#FFF7ED",
    card: "#FFFFFF",
    text: "#431407",
    muted: "#78350F",
    border: "#FED7AA",
    success: "#10B981",
    warning: "#EA580C",
    error: "#DC2626"
  },
  forest: {
    name: "Forest Growth",
    description: "Natural green harmony",
    preview: "linear-gradient(135deg, #15803D 0%, #14532D 100%)",
    primary: "#15803D",
    secondary: "#14532D",
    accent: "#16A34A",
    sidebar: "#064E3B",
    sidebarText: "#D1FAE5",
    background: "#F0FDF4",
    card: "#FFFFFF",
    text: "#064E3B",
    muted: "#6B7280",
    border: "#BBF7D0",
    success: "#15803D",
    warning: "#F59E0B",
    error: "#EF4444"
  },
  sapphire: {
    name: "Sapphire Night",
    description: "Elegant deep blue",
    preview: "linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)",
    primary: "#1E3A8A",
    secondary: "#1E40AF",
    accent: "#3B82F6",
    sidebar: "#0F172A",
    sidebarText: "#BFDBFE",
    background: "#EFF6FF",
    card: "#FFFFFF",
    text: "#1E3A8A",
    muted: "#64748B",
    border: "#BFDBFE",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444"
  },
  executive: {
    name: "Executive Gold",
    description: "Premium golden accent",
    preview: "linear-gradient(135deg, #78350F 0%, #92400E 100%)",
    primary: "#78350F",
    secondary: "#92400E",
    accent: "#B45309",
    sidebar: "#1C1917",
    sidebarText: "#FBBF24",
    background: "#FAFAF9",
    card: "#FFFFFF",
    text: "#1C1917",
    muted: "#78716C",
    border: "#E7E5E4",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444"
  },
  midnight: {
    name: "Midnight Purple",
    description: "Deep midnight hues",
    preview: "linear-gradient(135deg, #3730A3 0%, #4338CA 100%)",
    primary: "#3730A3",
    secondary: "#4338CA",
    accent: "#6366F1",
    sidebar: "#1E1B4B",
    sidebarText: "#A5B4FC",
    background: "#EEF2FF",
    card: "#FFFFFF",
    text: "#1E1B4B",
    muted: "#64748B",
    border: "#C7D2FE",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444"
  },
  minimalist: {
    name: "Swiss Minimalist",
    description: "Clean black & white",
    preview: "linear-gradient(135deg, #000000 0%, #333333 100%)",
    primary: "#000000",
    secondary: "#333333",
    accent: "#666666",
    sidebar: "#000000",
    sidebarText: "#FFFFFF",
    background: "#FFFFFF",
    card: "#FAFAFA",
    text: "#000000",
    muted: "#6B7280",
    border: "#E5E5E5",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444"
  }
};

// Hex to RGB helper
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
};

// Apply all theme CSS variables to document root
export function applyTheme(themeId) {
  const theme = themes[themeId] || themes.aurora;
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-secondary', theme.secondary);
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty('--theme-sidebar', theme.sidebar);
  root.style.setProperty('--theme-sidebar-text', theme.sidebarText);
  root.style.setProperty('--theme-background', theme.background);
  root.style.setProperty('--theme-card', theme.card);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-muted', theme.muted);
  root.style.setProperty('--theme-border', theme.border);
  root.style.setProperty('--theme-success', theme.success);
  root.style.setProperty('--theme-warning', theme.warning);
  root.style.setProperty('--theme-error', theme.error);
  root.style.setProperty('--theme-primary-rgb', hexToRgb(theme.primary));
  root.style.setProperty('--theme-secondary-rgb', hexToRgb(theme.secondary));
  localStorage.setItem('theme', themeId);
}
