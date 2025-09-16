import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Event, User, EventNotification } from '../../types';
import { getEvents, getFamilyStudents, getStudentEvents, getEventNotifications, markEventNotificationAsRead, getCurrentUser, submitEventResponse, getEventResponse } from '../../api';
import AccordionItem from '../../components/AccordionItem';

const EventsPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [notifications, setNotifications] = useState<EventNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [eventResponses, setEventResponses] = useState<Record<string, {response: string; responseMessage?: string}>>({});
    const [responseLoading, setResponseLoading] = useState<string | null>(null);

    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // First get the current user
                const user = await getCurrentUser();
                setCurrentUser(user);
                
                if (user?.id) {
                    const [eventsData, notificationsData] = await Promise.all([
                        getStudentEvents(user.id),
                        getEventNotifications(user.id)
                    ]);
                    setEvents(eventsData);
                    setNotifications(notificationsData);
                    
                    // Fetch existing responses for all events
                    const responsePromises = eventsData.map(async (event) => {
                        const response = await getEventResponse(event.id);
                        return { eventId: event.id, response };
                    });
                    
                    const responses = await Promise.all(responsePromises);
                    const responseMap: Record<string, {response: string; responseMessage?: string}> = {};
                    responses.forEach(({ eventId, response }) => {
                        if (response) {
                            responseMap[eventId] = response;
                        }
                    });
                    setEventResponses(responseMap);
                }
            } catch (error) {
                console.error("Failed to fetch events:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleNotificationClick = async (notification: EventNotification) => {
        if (!notification.isRead) {
            try {
                await markEventNotificationAsRead(notification.id);
                setNotifications(prev => 
                    prev.map(n => n.id === notification.id ? { ...n, isRead: true, readAt: new Date() } : n)
                );
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
            }
        }
    };

    const handleEventResponse = async (eventId: string, response: 'accepted' | 'declined' | 'maybe', responseMessage?: string) => {
        setResponseLoading(eventId);
        try {
            await submitEventResponse(eventId, response, responseMessage);
            setEventResponses(prev => ({
                ...prev,
                [eventId]: { response, responseMessage }
            }));
        } catch (error) {
            console.error("Failed to submit event response:", error);
            alert("Failed to submit response. Please try again.");
        } finally {
            setResponseLoading(null);
        }
    };

    const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        const now = new Date();
        
        switch (filter) {
            case 'upcoming':
                return eventDate >= now;
            case 'past':
                return eventDate < now;
            default:
                return true;
        }
    }).sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return filter === 'past' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-800';
            case 'Low': return 'bg-gray-100 text-gray-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getEventTypeColor = (eventType?: string) => {
        switch (eventType) {
            case 'Academic': return 'bg-blue-100 text-blue-800';
            case 'Cultural': return 'bg-purple-100 text-purple-800';
            case 'Sports': return 'bg-green-100 text-green-800';
            case 'Notice': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center">Loading events...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Events</h1>
                <p className="text-gray-600">Stay updated with upcoming events and announcements</p>
            </motion.div>

            {/* Filter Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-lg border border-gray-200">
                    {(['upcoming', 'all', 'past'] as const).map((filterOption) => (
                        <button
                            key={filterOption}
                            onClick={() => setFilter(filterOption)}
                            className={`flex-1 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                filter === filterOption
                                    ? 'bg-indigo-600 text-white shadow-lg transform scale-105'
                                    : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                        >
                            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Events Grid */}
            {filteredEvents.length > 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                >
                    {filteredEvents.map((event, index) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => setSelectedEvent(event)}
                            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group hover:-translate-y-1 border border-gray-100"
                        >
                            {/* Event Images */}
                            {event.images && event.images.length > 0 && (
                                <div className="h-52 bg-gradient-to-br from-indigo-100 to-purple-100 relative overflow-hidden">
                                    <img
                                        src={event.images[0].url}
                                        alt={event.images[0].caption || event.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    {event.images.length > 1 && (
                                        <div className="absolute bottom-3 right-3 bg-black bg-opacity-80 text-white text-xs px-3 py-1 rounded-full font-medium backdrop-blur-sm">
                                            +{event.images.length - 1} more
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                </div>
                            )}

                            <div className="p-6">
                                {/* Date and badges */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="text-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-xl shadow-lg">
                                        <div className="text-2xl font-bold">{new Date(event.date).getDate()}</div>
                                        <div className="text-xs uppercase font-medium">{new Date(event.date).toLocaleString('default', { month: 'short' })}</div>
                                    </div>
                                    <div className="flex flex-col space-y-2">
                                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${getPriorityColor(event.priority)}`}>
                                            {event.priority || 'Medium'}
                                        </span>
                                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${getEventTypeColor(event.eventType)}`}>
                                            {event.eventType || 'General'}
                                        </span>
                                    </div>
                                </div>

                                {/* Event details */}
                                <h3 className="font-bold text-xl text-gray-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">{event.title}</h3>
                                
                                <div className="space-y-2 mb-4">
                                    {event.time && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                                                <span className="text-indigo-600 text-xs">🕐</span>
                                            </div>
                                            <span className="font-medium">{event.time}</span>
                                        </div>
                                    )}
                                    
                                    {event.location && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-3">
                                                <span className="text-red-600 text-xs">📍</span>
                                            </div>
                                            <span className="font-medium">{event.location}</span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-gray-700 text-sm line-clamp-3 mb-6 leading-relaxed">{event.description}</p>
                                
                                {/* Response Buttons */}
                                <div className="pt-4 border-t border-gray-100">
                                    {eventResponses[event.id] ? (
                                        <div className="text-center">
                                            <div className={`inline-flex items-center px-4 py-3 rounded-xl text-sm font-semibold shadow-lg ${
                                                eventResponses[event.id].response === 'accepted' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' :
                                                eventResponses[event.id].response === 'declined' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white' :
                                                'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                                            }`}>
                                                {eventResponses[event.id].response === 'accepted' && '✅ Accepted'}
                                                {eventResponses[event.id].response === 'declined' && '❌ Declined'}
                                                {eventResponses[event.id].response === 'maybe' && '🤔 Maybe'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEventResponse(event.id, 'accepted');
                                                }}
                                                disabled={responseLoading === event.id}
                                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                            >
                                                {responseLoading === event.id ? (
                                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
                                                ) : (
                                                    '✅ Accept'
                                                )}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEventResponse(event.id, 'maybe');
                                                }}
                                                disabled={responseLoading === event.id}
                                                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                            >
                                                {responseLoading === event.id ? (
                                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
                                                ) : (
                                                    '🤔 Maybe'
                                                )}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEventResponse(event.id, 'declined');
                                                }}
                                                disabled={responseLoading === event.id}
                                                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                            >
                                                {responseLoading === event.id ? (
                                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
                                                ) : (
                                                    '❌ Decline'
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20 bg-white rounded-2xl shadow-lg border border-gray-100"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                        <div className="text-4xl">📅</div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">No Events Found</h3>
                    <p className="text-gray-600 text-lg max-w-md mx-auto">
                        {filter === 'upcoming' && "No upcoming events scheduled. Check back soon for new announcements!"}
                        {filter === 'past' && "No past events to show at the moment."}
                        {filter === 'all' && "No events available at this time. Stay tuned for exciting updates!"}
                    </p>
                </motion.div>
            )}

            {/* Event Detail Modal */}
            {selectedEvent && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                    onClick={() => setSelectedEvent(null)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
                                    <p className="text-gray-600 mt-1">
                                        {new Date(selectedEvent.date).toLocaleDateString()} 
                                        {selectedEvent.time && ` at ${selectedEvent.time}`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {/* Event Images Gallery */}
                            {selectedEvent.images && selectedEvent.images.length > 0 && (
                                <div className="mb-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedEvent.images.map((image, index) => (
                                            <div key={index} className="rounded-lg overflow-hidden">
                                                <img
                                                    src={image.url}
                                                    alt={image.caption || `Event image ${index + 1}`}
                                                    className="w-full h-48 object-cover"
                                                />
                                                {image.caption && (
                                                    <p className="text-sm text-gray-600 mt-2 px-2">{image.caption}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Event Details */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                                    <p className="text-gray-700">{selectedEvent.description}</p>
                                </div>

                                {selectedEvent.location && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                                        <p className="text-gray-700">📍 {selectedEvent.location}</p>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 mb-6">
                                    <span className={`px-3 py-1 rounded-full text-sm ${getPriorityColor(selectedEvent.priority)}`}>
                                        {selectedEvent.priority || 'Medium'} Priority
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm ${getEventTypeColor(selectedEvent.eventType)}`}>
                                        {selectedEvent.eventType || 'General'}
                                    </span>
                                </div>

                                {/* Response Section in Modal */}
                                <div className="border-t pt-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">Your Response</h3>
                                    {eventResponses[selectedEvent.id] ? (
                                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                                            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                                                eventResponses[selectedEvent.id].response === 'accepted' ? 'bg-green-100 text-green-800' :
                                                eventResponses[selectedEvent.id].response === 'declined' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {eventResponses[selectedEvent.id].response === 'accepted' && '✅ You have accepted this event'}
                                                {eventResponses[selectedEvent.id].response === 'declined' && '❌ You have declined this event'}
                                                {eventResponses[selectedEvent.id].response === 'maybe' && '🤔 You marked this as maybe'}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEventResponses(prev => {
                                                        const newResponses = { ...prev };
                                                        delete newResponses[selectedEvent.id];
                                                        return newResponses;
                                                    });
                                                }}
                                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                                            >
                                                Change response
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-3">
                                            <button
                                                onClick={() => handleEventResponse(selectedEvent.id, 'accepted')}
                                                disabled={responseLoading === selectedEvent.id}
                                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                                            >
                                                {responseLoading === selectedEvent.id ? 'Submitting...' : '✅ Accept'}
                                            </button>
                                            <button
                                                onClick={() => handleEventResponse(selectedEvent.id, 'maybe')}
                                                disabled={responseLoading === selectedEvent.id}
                                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                                            >
                                                {responseLoading === selectedEvent.id ? 'Submitting...' : '🤔 Maybe'}
                                            </button>
                                            <button
                                                onClick={() => handleEventResponse(selectedEvent.id, 'declined')}
                                                disabled={responseLoading === selectedEvent.id}
                                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                                            >
                                                {responseLoading === selectedEvent.id ? 'Submitting...' : '❌ Decline'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default EventsPage;