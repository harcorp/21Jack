const short = new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" });

/** Local short date-time. Only call on the client (data is fetched after mount). */
export const shortDate = (iso: string) => short.format(new Date(iso));
