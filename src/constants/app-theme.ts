// Central theme file - dark theme colors used across the whole app

export const Colors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceElevated: '#252525',
  border: '#333333',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#777777',
  accent: '#208AEF',
  accentSoft: '#1A3A5C',
  danger: '#E5484D',
};

// Per file-type colors, matching common file manager conventions
export const CategoryColors: Record<string, string> = {
  pdf: '#E5484D',       // red
  word: '#2F6FE4',      // blue
  excel: '#1DA463',     // green
  ppt: '#E8792C',       // orange
  txt: '#8A8A8A',       // gray
  zip: '#B98900',       // gold
  image: '#17A2B8',     // teal
  video: '#D6409F',     // pink
  recent: '#208AEF',    // brand blue
  bookmarks: '#F5B301', // yellow/gold
  other: '#666666',
};

export function getCategoryColor(key: string): string {
  return CategoryColors[key] || Colors.accent;
}
