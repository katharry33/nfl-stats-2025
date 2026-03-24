/**
 * Safe number formatting for sports stats.
 * Returns a dash if the value is null/undefined.
 */
export const fmt = (v: number | string | null | undefined, decimals: number = 1): string => {
    if (v === null || v === undefined || v === '') return '—';
    const num = Number(v);
    if (isNaN(num)) return '—';
    
    // Don't show .0 for whole numbers if you prefer a cleaner look
    return num % 1 === 0 ? num.toString() : num.toFixed(decimals);
  };
  
  /**
   * Formats a decimal (0.65) or whole number (65) as a percentage (65.0%).
   */
  export const fmtPct = (v: number | string | null | undefined): string => {
    if (v === null || v === undefined || v === '') return '—';
    const num = Number(v);
    if (isNaN(num)) return '—';
  
    // If the number is < 2 (like 0.65), treat as decimal; otherwise treat as whole (65)
    const percent = num <= 2 ? num * 100 : num;
    return `${percent.toFixed(1)}%`;
  };
  
  /**
   * Formats dates for the table (e.g., "Mar 23")
   */
  export const formatBetDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '—';
    }
  };