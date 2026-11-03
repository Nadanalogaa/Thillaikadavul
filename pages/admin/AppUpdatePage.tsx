import React, { useEffect, useState } from 'react';
import { getAppSettings, saveAppSettings, type AppVersionSettings } from '../../api';

// Admin → App update. Tells the mobile app which version families should be
// running. Build numbers, not version names, because they are whole numbers
// and always increase — "1.0.4+5" has build number 5.

const BLANK: AppVersionSettings = {
  android_latest_build: '0',
  android_minimum_build: '0',
  android_version_name: '',
  android_store_url: '',
  update_message: '',
  upi_id: '',
  upi_payee_name: '',
  upi_merchant_code: '',
  upi_txn_ref: '',
  upi_prefill_amount: 'no',
  upi_qr_text: '',
  upi_app_links: 'no',
  upi_button_id: '',
  upi_button_name: '',
  fee_pay_mode: 'upload',
};

const AppUpdatePage: React.FC = () => {
  const [form, setForm] = useState<AppVersionSettings>(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAppSettings()
      .then(s => setForm({ ...BLANK, ...s }))
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof AppVersionSettings, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setSaved(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      setForm({ ...BLANK, ...(await saveAppSettings(form)) });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;

  const label = 'mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300';
  const card = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800';

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">App update</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tell families on Android when a newer app is on the Play Store. iPhone users need
            nothing — nadanaloga.com/app is always current.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm font-medium text-green-600">Saved</span>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <section className={card}>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
          Current release
        </h2>
        <div className="grid grid-cols-6 gap-x-4 gap-y-3">
          <div className="col-span-6 sm:col-span-2">
            <label className={label} htmlFor="latest">Latest build number</label>
            <input id="latest" type="number" min={0} value={form.android_latest_build}
              onChange={e => set('android_latest_build', e.target.value)} className="form-input w-full text-sm" />
            <p className="mt-1 text-xs text-gray-400">Shows a dismissible “Update” banner below this.</p>
          </div>
          <div className="col-span-6 sm:col-span-2">
            <label className={label} htmlFor="minimum">Minimum build number</label>
            <input id="minimum" type="number" min={0} value={form.android_minimum_build}
              onChange={e => set('android_minimum_build', e.target.value)} className="form-input w-full text-sm" />
            <p className="mt-1 text-xs text-gray-400">Blocks the app below this. Leave at 0 unless a release is urgent.</p>
          </div>
          <div className="col-span-6 sm:col-span-2">
            <label className={label} htmlFor="name">Version name</label>
            <input id="name" value={form.android_version_name} placeholder="1.0.4"
              onChange={e => set('android_version_name', e.target.value)} className="form-input w-full text-sm" />
            <p className="mt-1 text-xs text-gray-400">Shown to families, e.g. “Version 1.0.4 is available”.</p>
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
          What families see
        </h2>
        <div className="space-y-3">
          <div>
            <label className={label} htmlFor="msg">Message (optional)</label>
            <textarea id="msg" rows={2} value={form.update_message}
              onChange={e => set('update_message', e.target.value)}
              placeholder="Teachers can now mark attendance and share what was taught in class."
              className="form-textarea w-full text-sm" />
          </div>
          <div>
            <label className={label} htmlFor="url">Play Store link</label>
            <input id="url" value={form.android_store_url}
              onChange={e => set('android_store_url', e.target.value)}
              placeholder="https://play.google.com/store/apps/details?id=com.nadanaloga.nadanaloga_mobile"
              className="form-input w-full text-sm" />
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
          Fee payments by UPI
        </h2>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Families tap Pay on a bill and their UPI app opens with this ID, the amount and the bill
          number filled in. They then upload the screenshot, and you approve it under Fees.
          For a bank merchant ID (e.g. HDFC SmartHub Vyapar), also fill the merchant code and QR
          reference — without them UPI apps say the receiver's ID is not available.
        </p>
        <div className="mb-3">
          <label className={label} htmlFor="paymode">What the bill button does in the app</label>
          <select id="paymode" value={form.fee_pay_mode || 'upload'} onChange={e => set('fee_pay_mode', e.target.value)} className="form-select w-full text-sm">
            <option value="upload">"Upload payment screenshot · ₹X" — families pay as they like, then upload</option>
            <option value="upi">"Pay" — opens UPI apps / the academy QR, then upload</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="upi">UPI ID</label>
            <input id="upi" value={form.upi_id || ''} onChange={e => set('upi_id', e.target.value.trim())}
              placeholder="name@okhdfcbank" className="form-input w-full text-sm" />
          </div>
          <div>
            <label className={label} htmlFor="upiname">Payee name (as the bank shows it)</label>
            <input id="upiname" value={form.upi_payee_name || ''} onChange={e => set('upi_payee_name', e.target.value)}
              placeholder="NADANALOGA NATYALAYA" className="form-input w-full text-sm" />
          </div>
          <div>
            <label className={label} htmlFor="upimc">Merchant code (from the bank's QR)</label>
            <input id="upimc" value={form.upi_merchant_code || ''} onChange={e => set('upi_merchant_code', e.target.value.trim())}
              placeholder="8211" className="form-input w-full text-sm" />
          </div>
          <div>
            <label className={label} htmlFor="upitr">QR reference (from the bank's QR)</label>
            <input id="upitr" value={form.upi_txn_ref || ''} onChange={e => set('upi_txn_ref', e.target.value.trim())}
              placeholder="STQD…" className="form-input w-full text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="upiprefill">Fill in the amount in the UPI app</label>
            <select id="upiprefill" value={form.upi_prefill_amount || 'no'} onChange={e => set('upi_prefill_amount', e.target.value)} className="form-select w-full text-sm">
              <option value="no">No — the family types the amount (works with a bank's merchant QR)</option>
              <option value="yes">Yes — amount filled in (only if the bank provides signed links)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="upiapps">Open-in-app buttons (Google Pay, PhonePe…)</label>
            <select id="upiapps" value={form.upi_app_links || 'no'} onChange={e => set('upi_app_links', e.target.value)} className="form-select w-full text-sm">
              <option value="no">Off — families scan the academy QR (HDFC SmartHub Vyapar and other counter QRs)</option>
              <option value="yes">On — only if the bank enabled payments from app links for this ID</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="upibtn">UPI ID for the app buttons (optional)</label>
            <input id="upibtn" value={form.upi_button_id || ''} onChange={e => set('upi_button_id', e.target.value.trim())}
              placeholder="Same as above if empty" className="form-input w-full text-sm" />
            <p className="mt-1 text-xs text-gray-500">Use an ID that accepts payments opened from apps (a personal Google Pay ID does; a bank counter QR ID may not).</p>
          </div>
          <div>
            <label className={label} htmlFor="upibtnname">Name for the app buttons' ID</label>
            <input id="upibtnname" value={form.upi_button_name || ''} onChange={e => set('upi_button_name', e.target.value)}
              placeholder="NADANALOGA NATYALAYA" className="form-input w-full text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="upiqr">Bank QR text (exactly as in the bank's QR)</label>
            <textarea id="upiqr" rows={2} value={form.upi_qr_text || ''} onChange={e => set('upi_qr_text', e.target.value.trim())}
              placeholder="000201010211…" className="form-textarea w-full font-mono text-xs" />
            <p className="mt-1 text-xs text-gray-500">The app shows this QR for families to scan or save. Leave empty to build one from the UPI ID.</p>
          </div>
        </div>
      </section>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        After publishing a release, set the latest build number to the one you uploaded
        (“1.0.4+5” means build <strong>5</strong>). Most phones update by themselves; this reaches
        the rest.
      </p>
    </form>
  );
};

export default AppUpdatePage;
