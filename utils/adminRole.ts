// Who is signed in to the admin pages: the super admin (can delete) or a
// staff admin (views, adds and edits; deleting is hidden). The server enforces
// the same rule; this only decides which buttons to show. AdminLayout refreshes
// the flag from the server whenever an admin page opens.
const KEY = 'admin.isSuperAdmin';

export const isSuperAdmin = (): boolean => {
    try {
        const v = localStorage.getItem(KEY);
        if (v !== null) return v === 'true';
        const u = JSON.parse(localStorage.getItem('currentUser') || 'null');
        return !!u && (u.isSuperAdmin === true || u.is_super_admin === true);
    } catch { return false; }
};

/** Ask the server who is signed in; true when the super admin flag changed. */
export const refreshAdminRole = async (): Promise<boolean> => {
    try {
        const r = await fetch('/api/session', { credentials: 'include' });
        if (!r.ok) return false;
        const u = await r.json();
        const next = String(u && u.is_super_admin === true);
        const changed = localStorage.getItem(KEY) !== next;
        localStorage.setItem(KEY, next);
        return changed;
    } catch { return false; }
};

export const SUPER_ADMIN_ONLY = 'Only the super admin can delete. Ask the super admin if this needs removing.';
