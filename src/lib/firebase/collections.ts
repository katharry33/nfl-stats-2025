export const getBettingLogCollectionName = (league: string) => {
    const year = new Date().getFullYear();
    if (league === 'nba') {
        return `bettingLogNba_${year}`;
    }
    if (league === 'nfl') {
        return `bettingLogNfl_${year}`;
    }
    throw new Error(`Invalid league: ${league}`);
};