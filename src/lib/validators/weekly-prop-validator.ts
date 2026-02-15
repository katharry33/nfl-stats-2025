export function validateWeeklyPropRow(row: any) {
  // Check for the exact CSV header including the question mark
  if (!row['Over/Under?'] && !row['OverUnder']) {
     return { valid: false, error: 'Over/Under column is missing' };
  }

  const transformedData = {
    // ...
    // Map the weird CSV header to your clean internal type
    overunder: row['Over/Under?'] || row['OverUnder'] || 'Over',
  };
  
  return { valid: true, data: transformedData };
}