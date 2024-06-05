/**
 * Determines whether white or black text will be more readable on a given background color.
 * @param backgroundColor - The background color in hexadecimal format (e.g., "#RRGGBB").
 * @returns "white" or "black" - The text color that provides better contrast.
 */
export function getReadableTextColor(backgroundColor: string): string {
  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  };

  // Helper function to calculate luminance
  const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  // Convert background color to RGB
  const rgb = hexToRgb(backgroundColor);

  // Calculate luminance of the background color
  const bgLuminance = luminance(rgb);

  // Determine the readable text color based on luminance
  return bgLuminance > 0.5 ? "black" : "white";
}
