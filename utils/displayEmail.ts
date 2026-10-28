// Children have a stand-in login address (…@child.nadanaloga.local) because
// each email can belong to one login only; the real address is the family's.
// Show the family's address, and never the stand-in.
export const isPlaceholderEmail = (e?: string | null) =>
    !e || !e.includes('@') || e.toLowerCase().endsWith('.nadanaloga.local');

export const displayEmail = (u: { email?: string | null; contactEmail?: string | null }): string => {
    if (u.contactEmail && !isPlaceholderEmail(u.contactEmail)) return u.contactEmail;
    return isPlaceholderEmail(u.email) ? '' : (u.email as string);
};
