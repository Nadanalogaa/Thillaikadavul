// "Mon 5:00 PM – 6:00 PM, Wed 5:00 PM – 6:00 PM" -> "Mon & Wed · 5:00–6:00 PM":
// days that share a time are listed together, and the AM/PM is said once.
export const compactTimes = (lines: string[]): string => {
    const groups = new Map<string, string[]>();
    const order: string[] = [];
    for (const line of lines) {
        const m = line.match(/^(\w{3})\s+(.+)$/);
        if (!m) { order.push(line); groups.set(line, []); continue; }
        const range = m[2].replace(/(\d{1,2}:\d{2})\s*(AM|PM)\s*–\s*(\d{1,2}:\d{2})\s*\2/, '$1–$3 $2').replace(/\s*–\s*/, '–');
        if (!groups.has(range)) { groups.set(range, []); order.push(range); }
        groups.get(range)!.push(m[1]);
    }
    return order.map(r => {
        const days = groups.get(r) || [];
        if (!days.length) return r;
        const d = days.length > 2 ? `${days.slice(0, -1).join(', ')} & ${days[days.length - 1]}` : days.join(' & ');
        return `${d} · ${r}`;
    }).join('; ');
};
