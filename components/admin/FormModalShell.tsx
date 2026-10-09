import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Modal from '../Modal';

// Shared frame for the admin's long forms (Add Student, Add Teacher).
// Title and the Cancel/Save buttons stay fixed at the top; only the fields
// scroll, and they sit in a centred column so wide screens don't spread a
// two-field row across a metre of white space.

interface FormModalShellProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    title: string;
    subtitle?: string;
    submitLabel: string;
    isSubmitting?: boolean;
    /** Tabs or filters shown under the title, above the scrolling fields. */
    toolbar?: React.ReactNode;
    children: React.ReactNode;
}

const FORM_ID = 'admin-form-modal';

export const FormModalShell: React.FC<FormModalShellProps> = ({
    isOpen, onClose, onSubmit, title, subtitle, submitLabel, isSubmitting, toolbar, children,
}) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="full">
            <div className={`flex h-full flex-col ${dark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                <header className={`flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${
                    dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                    <div className="min-w-0">
                        <h2 className={`truncate text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
                        {subtitle && (
                            <p className={`hidden truncate text-xs sm:block ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>
                        )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                                dark
                                    ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form={FORM_ID}
                            disabled={isSubmitting}
                            className="rounded-md bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? 'Saving…' : submitLabel}
                        </button>
                    </div>
                </header>

                {toolbar && (
                    <div className={`border-b px-4 sm:px-6 ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                        {toolbar}
                    </div>
                )}

                <form id={FORM_ID} onSubmit={onSubmit} className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:px-6">
                        {children}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

/** A titled card. `aside` sits on the right of the title row (e.g. a photo). */
export const Section: React.FC<{
    title: string;
    description?: string;
    aside?: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, description, aside, children }) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    return (
        <section className={`rounded-xl border p-4 shadow-sm ${
            dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className={`text-sm font-semibold uppercase tracking-wide ${dark ? 'text-gray-200' : 'text-gray-700'}`}>{title}</h3>
                    {description && <p className={`mt-0.5 text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>}
                </div>
                {aside}
            </div>
            {children}
        </section>
    );
};

/** Label + control. `span` is how many of the 6 grid columns it takes. */
export const Field: React.FC<{
    label: string;
    hint?: string;
    span?: 2 | 3 | 6;
    htmlFor?: string;
    children: React.ReactNode;
}> = ({ label, hint, span = 2, htmlFor, children }) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const spanClass = span === 6 ? 'sm:col-span-6' : span === 3 ? 'sm:col-span-3' : 'sm:col-span-2';
    return (
        <div className={`col-span-6 ${spanClass}`}>
            <label htmlFor={htmlFor} className={`mb-1 block text-xs font-medium ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                {label}
            </label>
            {children}
            {hint && <p className={`mt-1 text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{hint}</p>}
        </div>
    );
};

/** 6-column grid the Fields sit in. */
export const FieldGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="grid grid-cols-6 gap-x-4 gap-y-3">{children}</div>
);

export const inputClass = 'form-input w-full text-sm';
export const selectClass = 'form-select w-full text-sm';
export const textareaClass = 'form-textarea w-full text-sm';

/** Small round photo with Upload / Remove, for the title row of a Section. */
export const PhotoPicker: React.FC<{
    photoUrl?: string;
    name?: string;
    onChange: (dataUrl: string) => void;
}> = ({ photoUrl, name, onChange }) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const inputRef = React.useRef<HTMLInputElement>(null);
    const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => onChange(reader.result as string);
        reader.readAsDataURL(file);
    };
    const btn = `rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
        dark ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
    }`;
    return (
        <div className="flex flex-shrink-0 items-center gap-3">
            <img
                src={photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=e8eaf6&color=1a237e&size=128`}
                alt=""
                className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-light"
            />
            <div className="flex flex-col gap-1">
                <input type="file" ref={inputRef} onChange={pick} className="hidden" accept="image/png, image/jpeg" />
                <button type="button" onClick={() => inputRef.current?.click()} className={btn}>
                    {photoUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {photoUrl && (
                    <button
                        type="button"
                        onClick={() => { onChange(''); if (inputRef.current) inputRef.current.value = ''; }}
                        className={btn}
                    >
                        Remove
                    </button>
                )}
            </div>
        </div>
    );
};
