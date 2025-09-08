import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminNav from '../../components/admin/AdminNav';
import Modal from '../../components/Modal';
import ModalHeader from '../../components/ModalHeader';
import type { MediaItem } from '../../types';
import { MediaType } from '../../types';
import { addMediaItem, deleteMediaItem, getAdminMediaItems, updateMediaItem } from '../../api';

const ACCEPTED_IMAGE = 'image/*';
const ACCEPTED_VIDEO = 'video/*';
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB safety cap for base64 uploads

type FormState = {
  id?: string;
  type: MediaType;
  title: string;
  description?: string;
  urlOrFile?: string | File; // text url for youtube or selected File for upload
  uploadDate: string; // yyyy-mm-dd
};

const emptyForm = (): FormState => ({
  type: MediaType.Image,
  title: '',
  description: '',
  urlOrFile: undefined,
  uploadDate: new Date().toISOString().split('T')[0],
});

const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

const MediaForm: React.FC<{
  initial?: Partial<MediaItem>;
  onSave: (data: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => ({
    ...emptyForm(),
    id: initial?.id,
    type: initial?.type || MediaType.Image,
    title: initial?.title || '',
    description: initial?.description || '',
    uploadDate: initial?.uploadDate ? initial.uploadDate.substring(0,10) : new Date().toISOString().split('T')[0],
  }));

  const isYouTube = form.type === MediaType.YouTube;
  const isUpload = form.type === MediaType.Image || form.type === MediaType.Video;

  const handleFile = async (file?: File) => {
    if (!file) return setForm(prev => ({ ...prev, urlOrFile: undefined }));
    if (form.type === MediaType.Video && file.size > MAX_VIDEO_SIZE) {
      setError('Video is too large. Please keep under 50MB.');
      return;
    }
    setError(null);
    setForm(prev => ({ ...prev, urlOrFile: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      let finalUrl = '';
      if (isYouTube) {
        finalUrl = String(form.urlOrFile || '').trim();
        if (!finalUrl) throw new Error('Please provide a YouTube URL');
      } else if (isUpload) {
        if (!(form.urlOrFile instanceof File)) throw new Error('Please select a file to upload');
        finalUrl = await readAsDataUrl(form.urlOrFile);
      }

      await onSave({
        type: form.type,
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        url: finalUrl,
        uploadDate: form.uploadDate,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Type</label>
          <select
            className="form-input w-full"
            value={form.type}
            onChange={e => setForm(prev => ({ ...prev, type: e.target.value as MediaType, urlOrFile: undefined }))}
          >
            <option value={MediaType.Image}>Image Upload</option>
            <option value={MediaType.Video}>Video Upload</option>
            <option value={MediaType.YouTube}>YouTube Link</option>
          </select>
        </div>
        <div>
          <label className="form-label">Upload Date</label>
          <input type="date" value={form.uploadDate} onChange={e => setForm(prev => ({ ...prev, uploadDate: e.target.value }))} className="form-input w-full" />
        </div>
      </div>

      <div>
        <label className="form-label">Title</label>
        <input className="form-input w-full" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} required />
      </div>

      <div>
        <label className="form-label">Description</label>
        <textarea className="form-textarea w-full" rows={3} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
      </div>

      {isYouTube ? (
        <div>
          <label className="form-label">YouTube URL</label>
          <input className="form-input w-full" placeholder="https://www.youtube.com/watch?v=..." value={typeof form.urlOrFile === 'string' ? form.urlOrFile : ''} onChange={e => setForm(prev => ({ ...prev, urlOrFile: e.target.value }))} required />
        </div>
      ) : (
        <div>
          <label className="form-label">{form.type === MediaType.Image ? 'Image' : 'Video'} File</label>
          <input type="file" accept={form.type === MediaType.Image ? ACCEPTED_IMAGE : ACCEPTED_VIDEO} onChange={e => handleFile(e.target.files?.[0])} className="form-input w-full" />
          <p className="text-xs text-gray-500 mt-1">{form.type === MediaType.Video ? 'Max 50MB (stored as base64 for now)' : 'Max 5MB recommended'}</p>
        </div>
      )}

      <div className="pt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
};

const MediaManagementPage: React.FC = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminMediaItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onSaveNew = async (data: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addMediaItem(data);
    setAdding(false);
    await refresh();
  };

  const onSaveEdit = async (data: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editing) return;
    await updateMediaItem(editing.id, data);
    setEditing(null);
    await refresh();
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this media item?')) return;
    await deleteMediaItem(id);
    await refresh();
  };

  const canAddMore = items.length < 10;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <AdminPageHeader title="Media Management" subtitle="Upload images, videos, or add YouTube links for the home page carousel." backLinkPath="/admin/dashboard" backTooltipText="Back to Dashboard" />
      <AdminNav />

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-600">{items.length}/10 items used</p>
        <button className="btn-primary disabled:opacity-50" onClick={() => setAdding(true)} disabled={!canAddMore}>+ Add Media</button>
      </div>

      {loading && <p className="mt-6">Loading...</p>}
      {error && <p className="mt-6 text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-4 bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th-base">Preview</th>
                <th className="th-base">Title</th>
                <th className="th-base">Type</th>
                <th className="th-base">Uploaded</th>
                <th className="th-base text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="td-base">
                    {item.type === MediaType.YouTube ? (
                      <span className="text-xs text-gray-600">YouTube</span>
                    ) : item.type === MediaType.Video ? (
                      <video src={item.url} className="w-24 h-16 object-cover" />
                    ) : (
                      <img src={item.url} alt={item.title} className="w-24 h-16 object-cover" />
                    )}
                  </td>
                  <td className="td-base font-medium">{item.title}</td>
                  <td className="td-base capitalize">{item.type}</td>
                  <td className="td-base">{new Date(item.uploadDate).toLocaleDateString()}</td>
                  <td className="td-base text-right space-x-2">
                    <button className="btn-secondary" onClick={() => setEditing(item)}>Edit</button>
                    <button className="btn-danger" onClick={() => onDelete(item.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={adding} onClose={() => setAdding(false)} size="lg">
        <ModalHeader title="Add Media" />
        <MediaForm onSave={onSaveNew} onCancel={() => setAdding(false)} />
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} size="lg">
        <ModalHeader title="Edit Media" />
        {editing && (
          <MediaForm
            initial={editing}
            onSave={onSaveEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <style>{`
        .th-base { padding: 12px 24px; text-align: left; font-size: 12px; font-weight: 500; color: #4B5563; text-transform: uppercase; letter-spacing: 0.05em; }
        .td-base { padding: 16px 24px; vertical-align: middle; font-size: 14px; color: #374151; }
        .btn-primary { background-color: #1a237e; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
        .btn-primary:hover { background-color: #0d113d; }
        .btn-secondary { background-color: #e8eaf6; color: #1a237e; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
        .btn-danger { background-color: #fee2e2; color: #b91c1c; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
      `}</style>
    </div>
  );
};

export default MediaManagementPage;

