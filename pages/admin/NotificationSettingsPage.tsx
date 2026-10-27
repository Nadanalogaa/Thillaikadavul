import React, { useEffect, useMemo, useState } from 'react';
import {
  getNotificationSettings,
  saveNotificationSettings,
  type NotificationEventSetting,
} from '../../api';

// Admin → Notifications. One row per thing the academy tells people about,
// with the channels it may use. All three off means that event notifies nobody.

const CHANNELS = [
  { key: 'in_app' as const, label: 'In-app', hint: 'Shows in the notifications bell' },
  { key: 'push' as const, label: 'Push', hint: 'Phone notification, even when the app is closed' },
  { key: 'email' as const, label: 'Email', hint: 'Sent to the address on the account' },
];

const NotificationSettingsPage: React.FC = () => {
  const [events, setEvents] = useState<NotificationEventSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    getNotificationSettings()
      .then(setEvents)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const byGroup = new Map<string, NotificationEventSetting[]>();
    for (const e of events) {
      if (!byGroup.has(e.group)) byGroup.set(e.group, []);
      byGroup.get(e.group)!.push(e);
    }
    return [...byGroup.entries()];
  }, [events]);

  const update = (key: string, patch: Partial<NotificationEventSetting['channels']>) => {
    setEvents(prev => prev.map(e => (e.key === key ? { ...e, channels: { ...e.channels, ...patch } } : e)));
    setDirty(true);
    setSaved(false);
  };

  const setAll = (key: string, on: boolean) =>
    update(key, { in_app: on, push: on, email: on });

  const silent = (e: NotificationEventSetting) =>
    !e.channels.in_app && !e.channels.push && !e.channels.email;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveNotificationSettings(events);
      setSaved(true);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading notification settings…</div>;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose how each kind of update reaches families and staff. Turn every channel off to
            stop that notification entirely.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm font-medium text-green-600">Saved</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {groups.map(([group, rows]) => (
          <section key={group} className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="border-b border-gray-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-700 dark:text-gray-200">
              {group}
            </h2>

            <div className="hidden grid-cols-12 gap-2 px-4 pt-3 text-xs font-medium text-gray-500 sm:grid dark:text-gray-400">
              <div className="col-span-6">Activity</div>
              {CHANNELS.map(c => (
                <div key={c.key} className="col-span-2 text-center" title={c.hint}>{c.label}</div>
              ))}
            </div>

            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map(e => (
                <li key={e.key} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                  <div className="col-span-12 sm:col-span-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{e.label}</span>
                      {silent(e) && (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-200">
                          No notification
                        </span>
                      )}
                    </div>
                    {e.detail && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{e.detail}</p>}
                    <button
                      type="button"
                      onClick={() => setAll(e.key, silent(e))}
                      className="mt-1 text-xs font-medium text-brand-primary hover:underline"
                    >
                      {silent(e) ? 'Turn all on' : 'Turn all off'}
                    </button>
                  </div>

                  {CHANNELS.map(c => (
                    <label
                      key={c.key}
                      className="col-span-4 flex items-center justify-start gap-2 sm:col-span-2 sm:justify-center"
                      title={c.hint}
                    >
                      <input
                        type="checkbox"
                        checked={e.channels[c.key]}
                        onChange={ev => update(e.key, { [c.key]: ev.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-xs text-gray-600 sm:hidden dark:text-gray-300">{c.label}</span>
                    </label>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
