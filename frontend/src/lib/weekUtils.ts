/** Returns ISO date string (YYYY-MM-DD) for a Date */
export function toISODate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/** Get the Monday of the week for a given date (local time, noon). */
export function getMonday(d: Date): Date {
    const day = d.getDay(); // 0 = Sun, 1 = Mon ...
    const diff = day === 0 ? 6 : day - 1;
    const r = new Date(d);
    r.setDate(d.getDate() - diff);
    r.setHours(12, 0, 0, 0);
    return r;
}

/** ISO Monday string of the week containing `d`. */
export function mondayISO(d: Date): string {
    return toISODate(getMonday(d));
}

/** Add N calendar days to a Date (returns a new Date). */
export function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

/** Returns the Mondays of the next N weeks starting from the week containing `from`. */
export function nextNMondays(from: Date, n: number): Date[] {
    const start = getMonday(from);
    const out: Date[] = [];
    for (let i = 0; i < n; i++) out.push(addDays(start, i * 7));
    return out;
}
