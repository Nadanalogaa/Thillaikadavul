import React, { useState, useEffect, useCallback } from 'react';
import type { Event } from '../../types';
import { getAdminEvents, addEvent, updateEvent, deleteEvent, getEventResponseStats } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminLayout from '../../components/admin/AdminLayout';
import { useTheme } from '../../contexts/ThemeContext';
import Modal from '../../components/Modal';
import ModalHeader from '../../components/ModalHeader';
import SendContentNotificationModal from '../../components/admin/SendContentNotificationModal';

const EventForm: React.FC<{ event?: Partial<Event>, onSave: (event: Partial<Event>) => Promise<void>, isLoading: boolean }> = ({ event, onSave, isLoading }) => {
    const [formData, setFormData] = useState<Partial<Event>>({});
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreview, setImagePreview] = useState<string[]>([]);

    useEffect(() => {
        setFormData({
            id: event?.id,
            title: event?.title || '',
            description: event?.description || '',
            date: event?.date ? new Date(event.date).toISOString().split('T')[0] : '',
            time: event?.time || '',
            location: event?.location || '',
            priority: event?.priority || 'Medium',
            eventType: event?.eventType || '',
            isActive: event?.isActive !== false,
        });
    }, [event]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setImageFiles(files);

        // Create preview URLs
        const previews = files.map(file => URL.createObjectURL(file));
        setImagePreview(previews);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Convert image files to base64
        const processedImages = [];
        if (imageFiles.length > 0) {
            for (const file of imageFiles) {
                try {
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    processedImages.push({ 
                        url: base64, 
                        filename: file.name,
                        caption: ''
                    });
                } catch (error) {
                    console.error('Error processing image:', error);
                }
            }
        }
        
        const dataToSave = {
            ...formData,
            date: formData.date ? new Date(formData.date) : new Date(),
            targetAudience: ['Student'], // Default target audience since field is removed from UI
            images: processedImages.length > 0 ? processedImages : event?.images || []
        };
        await onSave(dataToSave);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Event Title*</label>
                    <input name="title" value={formData.title} onChange={handleChange} required className="form-input w-full" />
                </div>
                <div>
                    <label className="form-label">Event Type</label>
                    <input name="eventType" value={formData.eventType} onChange={handleChange} className="form-input w-full" placeholder="e.g., Academic, Cultural, Sports, Notice" />
                </div>
            </div>

            <div>
                <label className="form-label">Description*</label>
                <textarea name="description" value={formData.description} onChange={handleChange} required rows={4} className="form-textarea w-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="form-label">Date*</label>
                    <input name="date" type="date" value={formData.date} onChange={handleChange} required className="form-input w-full" />
                </div>
                <div>
                    <label className="form-label">Time</label>
                    <input name="time" type="time" value={formData.time} onChange={handleChange} className="form-input w-full" />
                </div>
                <div>
                    <label className="form-label">Priority</label>
                    <select name="priority" value={formData.priority} onChange={handleChange} className="form-input w-full">
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="form-label">Location / Venue</label>
                <input name="location" value={formData.location} onChange={handleChange} className="form-input w-full" placeholder="e.g., Main Hall, Online, Classroom 1A" />
            </div>

            <div>
                <label className="form-label">Event Images (Optional)</label>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="form-input w-full" />
                {imagePreview.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                        {imagePreview.map((preview, index) => (
                            <img key={index} src={preview} alt={`Preview ${index + 1}`} className="w-20 h-20 object-cover rounded border" />
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center">
                <input name="isActive" type="checkbox" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label className="ml-2 block text-sm text-gray-900">Active Event (visible to students)</label>
            </div>

            <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setFormData({})} className="btn-secondary">
                    Reset
                </button>
                <button type="submit" disabled={isLoading} className="btn-primary">
                    {isLoading ? 'Saving...' : 'Save Event'}
                </button>
            </div>
        </form>
    );
};


const EventsManagementPage: React.FC = () => {
    const { theme } = useTheme();
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
    const [notifyingEvent, setNotifyingEvent] = useState<Event | null>(null);
    const [viewingResponses, setViewingResponses] = useState<Event | null>(null);
    const [responseStats, setResponseStats] = useState<Record<string, any>>({});

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAdminEvents();
            setEvents(data);
            
            // Fetch response stats for all events
            const statsPromises = data.map(async (event) => {
                const stats = await getEventResponseStats(event.id);
                return { eventId: event.id, stats };
            });
            
            const statsResults = await Promise.all(statsPromises);
            const statsMap: Record<string, any> = {};
            statsResults.forEach(({ eventId, stats }) => {
                statsMap[eventId] = stats;
            });
            setResponseStats(statsMap);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch events.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (event: Partial<Event>) => {
        setIsFormLoading(true);
        try {
            let successMessage = '';
            if (event.id) {
                await updateEvent(event.id, event);
                successMessage = `✅ Event "${event.title || 'Unnamed Event'}" updated successfully! 📧 Email notifications and in-app notifications sent to all participants.`;
            } else {
                await addEvent(event as Omit<Event, 'id'>);
                successMessage = `✅ Event "${event.title || 'New Event'}" created successfully! 📧 Email notifications and in-app notifications sent to all target audience members.`;
            }
            setEditingEvent(null);
            await fetchData();

            // Show success message
            alert(successMessage);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save event.');
        } finally {
            setIsFormLoading(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            try {
                await deleteEvent(id);
                await fetchData();
            } catch (err) {
                 alert(err instanceof Error ? err.message : 'Failed to delete event.');
            }
        }
    };

    return (
        <AdminLayout>
            <AdminPageHeader title="Events" subtitle="Create and manage school events." />

                <div className="mt-8">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setEditingEvent({})} className="btn-primary">
                            + Add New Event
                        </button>
                    </div>
                    {isLoading && <p>Loading events...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {!isLoading && !error && (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="th-base">Title</th>
                                        <th className="th-base">Date & Time</th>
                                        <th className="th-base">Type</th>
                                        <th className="th-base">Priority</th>
                                        <th className="th-base">Responses</th>
                                        <th className="th-base">Status</th>
                                        <th className="th-base text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {events.map(event => (
                                        <tr key={event.id}>
                                            <td className="td-base">
                                                <div>
                                                    <div className="font-medium text-gray-900">{event.title}</div>
                                                    {event.location && <div className="text-sm text-gray-500">{event.location}</div>}
                                                    {event.images && event.images.length > 0 && (
                                                        <div className="flex mt-1">
                                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                📸 {event.images.length} image{event.images.length > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="td-base">
                                                <div className="text-sm">
                                                    <div>{new Date(event.date).toLocaleDateString()}</div>
                                                    {event.time && <div className="text-gray-500">{event.time}</div>}
                                                </div>
                                            </td>
                                            <td className="td-base">
                                                <span className={`badge ${
                                                    event.eventType === 'Academic' ? 'badge-blue' :
                                                    event.eventType === 'Cultural' ? 'badge-purple' :
                                                    event.eventType === 'Sports' ? 'badge-green' :
                                                    event.eventType === 'Notice' ? 'badge-orange' :
                                                    'badge-gray'
                                                }`}>
                                                    {event.eventType || 'General'}
                                                </span>
                                            </td>
                                            <td className="td-base">
                                                <span className={`badge ${
                                                    event.priority === 'High' ? 'badge-red' :
                                                    event.priority === 'Low' ? 'badge-gray' :
                                                    'badge-yellow'
                                                }`}>
                                                    {event.priority || 'Medium'}
                                                </span>
                                            </td>
                                            <td className="td-base">
                                                <div className="text-xs space-y-1">
                                                    {responseStats[event.id] ? (
                                                        <>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-green-600">✅ {responseStats[event.id].accepted}</span>
                                                                <span className="text-yellow-600">🤔 {responseStats[event.id].maybe}</span>
                                                                <span className="text-red-600">❌ {responseStats[event.id].declined}</span>
                                                            </div>
                                                            <div className="text-gray-500">Total: {responseStats[event.id].total} responses</div>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400">No responses yet</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="td-base">
                                                <span className={`badge ${event.isActive ? 'badge-green' : 'badge-gray'}`}>
                                                    {event.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="td-base text-right space-x-2">
                                                <button onClick={() => setViewingResponses(event)} className="btn-send">Responses</button>
                                                <button onClick={() => setNotifyingEvent(event)} className="btn-send">Send</button>
                                                <button onClick={() => setEditingEvent(event)} className="btn-secondary">Edit</button>
                                                <button onClick={() => handleDelete(event.id)} className="btn-danger">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={!!editingEvent} onClose={() => setEditingEvent(null)} size="4xl">
                <ModalHeader title={editingEvent?.id ? 'Edit Event' : 'Add New Event'} />
                <EventForm event={editingEvent || {}} onSave={handleSave} isLoading={isFormLoading} />
            </Modal>
            
            <SendContentNotificationModal
                isOpen={!!notifyingEvent}
                onClose={() => setNotifyingEvent(null)}
                contentItem={notifyingEvent}
                contentType="Event"
            />

            {/* Response Details Modal */}
            <Modal isOpen={!!viewingResponses} onClose={() => setViewingResponses(null)} size="4xl">
                <ModalHeader title={`Event Responses: ${viewingResponses?.title}`} />
                {viewingResponses && responseStats[viewingResponses.id] && (
                    <div className="p-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="bg-green-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-600">{responseStats[viewingResponses.id].accepted}</div>
                                <div className="text-sm text-green-800">✅ Accepted</div>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-yellow-600">{responseStats[viewingResponses.id].maybe}</div>
                                <div className="text-sm text-yellow-800">🤔 Maybe</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-red-600">{responseStats[viewingResponses.id].declined}</div>
                                <div className="text-sm text-red-800">❌ Declined</div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-gray-600">{responseStats[viewingResponses.id].total}</div>
                                <div className="text-sm text-gray-800">📊 Total</div>
                            </div>
                        </div>

                        {/* Detailed Lists */}
                        <div className="space-y-6">
                            {/* Accepted Users */}
                            {responseStats[viewingResponses.id].acceptedUsers.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Accepted ({responseStats[viewingResponses.id].acceptedUsers.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {responseStats[viewingResponses.id].acceptedUsers.map((user: any) => (
                                            <div key={user.id} className="bg-green-50 p-3 rounded-lg border border-green-200">
                                                <div className="font-medium text-green-900">{user.name}</div>
                                                <div className="text-sm text-green-700">{user.email}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Maybe Users */}
                            {responseStats[viewingResponses.id].maybeUsers.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-yellow-800 mb-3">🤔 Maybe ({responseStats[viewingResponses.id].maybeUsers.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {responseStats[viewingResponses.id].maybeUsers.map((user: any) => (
                                            <div key={user.id} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                                <div className="font-medium text-yellow-900">{user.name}</div>
                                                <div className="text-sm text-yellow-700">{user.email}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Declined Users */}
                            {responseStats[viewingResponses.id].declinedUsers.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-red-800 mb-3">❌ Declined ({responseStats[viewingResponses.id].declinedUsers.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {responseStats[viewingResponses.id].declinedUsers.map((user: any) => (
                                            <div key={user.id} className="bg-red-50 p-3 rounded-lg border border-red-200">
                                                <div className="font-medium text-red-900">{user.name}</div>
                                                <div className="text-sm text-red-700">{user.email}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No responses message */}
                            {responseStats[viewingResponses.id].total === 0 && (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-4">📭</div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Responses Yet</h3>
                                    <p className="text-gray-600">Students haven't responded to this event yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <style>{`
                .th-base { padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 500; color: #4B5563; text-transform: uppercase; letter-spacing: 0.05em; }
                .td-base { padding: 16px; vertical-align: middle; font-size: 14px; color: #374151; }
                .btn-primary { background-color: #1a237e; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-primary:hover { background-color: #0d113d; }
                .btn-primary:disabled { background-color: #9fa8da; cursor: not-allowed; }
                .btn-secondary { background-color: #e8eaf6; color: #1a237e; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-danger { background-color: #fee2e2; color: #b91c1c; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-send { background-color: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .badge { font-size: 12px; font-weight: 500; padding: 4px 8px; border-radius: 12px; white-space: nowrap; }
                .badge-blue { background-color: #DBEAFE; color: #1E40AF; }
                .badge-purple { background-color: #EDE9FE; color: #5B21B6; }
                .badge-green { background-color: #D1FAE5; color: #065F46; }
                .badge-orange { background-color: #FED7AA; color: #C2410C; }
                .badge-red { background-color: #FEE2E2; color: #B91C1C; }
                .badge-yellow { background-color: #FEF3C7; color: #92400E; }
                .badge-gray { background-color: #F3F4F6; color: #6B7280; }
                .form-label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px; }
                .form-input, .form-textarea { width: 100%; padding: 8px 12px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 14px; transition: border-color 0.2s; }
                .form-input:focus, .form-textarea:focus { outline: none; border-color: #1a237e; box-shadow: 0 0 0 3px rgba(26, 35, 126, 0.1); }
            `}</style>
        </AdminLayout>
    );
};

export default EventsManagementPage;
