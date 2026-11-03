// The name to greet someone by. A family name like "D. Vijayan , V. Prema"
// or "Kalpana N / Vijay S" lists both parents: greet the first, and do not
// stop at a leading initial ("D." alone) — "D. Vijayan", "Kalpana".
export const greetingName = (fullName?: string | null): string => {
    const all = (fullName || '').trim();
    const first = (all.split(/\s*[,/&]\s*/).find(p => p.trim()) || all).trim();
    const out: string[] = [];
    for (const w of first.split(/\s+/).filter(Boolean)) {
        out.push(w);
        // An initial: "D.", "D", "S.K." — keep going to the actual name.
        const isInitial = w.replace(/\./g, '').length <= 2 && (w.includes('.') || w.length <= 2);
        if (!isInitial) break;
    }
    return out.join(' ');
};
