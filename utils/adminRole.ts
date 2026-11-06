// Who is signed in to the admin pages: the super admin (can delete) or a
// staff admin (views, adds and edits; deleting is hidden). The server enforces
// the same rule; this only decides which buttons to show. AdminLayout refreshes
// the flag from the server whenever an admin page opens.
const KEY = 'admin.isSuperAdmin';

// Set fresh at every login and cleared at logout, so on a shared computer a
// staff admin never inherits the super admin's "can delete" from an earlier
// sign-in. Unknown means no: delete stays hidden until the server says so.
export const isSuperAdmin = (): boolean => {
    try { return localStorage.getItem(KEY) === 'true'; } catch { return false; }
};

/** Record who just signed in (from the login response); null clears it. */
export const setAdminRole = (isSuper: boolean | null) => {
    try {
        if (isSuper === null) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, String(isSuper === true));
    } catch { /* storage blocked: buttons stay hidden */ }
};

/** Ask the server who is signed in; true when the super admin flag changed. */
export const refreshAdminRole = async (): Promise<boolean> => {
    try {
        const r = await fetch('/api/session', { credentials: 'include' });
        if (!r.ok) {   // signed out on the server: never keep a stale "super admin"
            const was = localStorage.getItem(KEY) === 'true';
            localStorage.setItem(KEY, 'false');
            return was;
        }
        const u = await r.json();
        const next = String(u && u.is_super_admin === true);
        const changed = localStorage.getItem(KEY) !== next;
        localStorage.setItem(KEY, next);
        return changed;
    } catch { return false; }
};

export const SUPER_ADMIN_ONLY = 'Only the super admin can delete. Ask the super admin if this needs removing.';
