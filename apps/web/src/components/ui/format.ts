const credits = new Intl.NumberFormat("en-US");

export const formatCredits = (n: number) => credits.format(n);
export const formatSigned = (n: number) => (n > 0 ? `+${credits.format(n)}` : n < 0 ? `−${credits.format(-n)}` : "0");
