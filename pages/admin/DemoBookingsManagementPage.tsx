import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Mail,
  Phone,
  Globe,
  X,
  User,
  Search,
  Share2,
  Copy,
  MessageCircle,
  CheckSquare
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getDemoBookings, updateDemoBookingStatus, deleteDemoBooking, getDemoBookingStats } from '../../api';
import type { DemoBooking } from '../../types';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminLayout from '../../components/admin/AdminLayout';

// Booking dates are shown in academy time (IST) whatever the viewer's device zone.
const formatBookedDate = (dateString?: string) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
};

const formatBookedTime = (dateString?: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Plain text that reads well in WhatsApp (*bold* is WhatsApp markup).
const buildShareText = (list: DemoBooking[]) => {
  const header = `*Nadanaloga – Demo bookings (${list.length})*`;
  const blocks = list.map((b, i) => {
    const lines = [`${i + 1}. *${b.name || 'Unknown'}*`];
    if (b.courseName) lines.push(`Course: ${b.courseName}`);
    if (b.phoneNumber) lines.push(`Phone: ${b.phoneNumber}`);
    if (b.email) lines.push(`Email: ${b.email}`);
    if (b.parentName) lines.push(`Parent: ${b.parentName}`);
    if (b.country) lines.push(`Country: ${b.country}`);
    const preferred = [b.preferredDate, b.preferredTime].filter(Boolean).join(' ');
    if (preferred) lines.push(`Preferred: ${preferred}`);
    lines.push(`Booked on: ${formatBookedDate(b.createdAt)}, ${formatBookedTime(b.createdAt)}`);
    lines.push(`Status: ${capitalize(b.status)}`);
    if (b.message) lines.push(`Message: ${b.message}`);
    return lines.join('\n');
  });
  return [header, ...blocks].join('\n\n');
};

const DemoBookingsManagementPage: React.FC = () => {
  const { theme } = useTheme();
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DemoBooking['status']>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    thisMonth: 0
  });

  // Modal state for managing bookings
  const [selectedBooking, setSelectedBooking] = useState<DemoBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Share: ids ticked in the table, and the list waiting in the share dialog
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareList, setShareList] = useState<DemoBooking[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchBookings();
    fetchStats();
  }, []);

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return bookings.filter(booking => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
      if (!term) return true;
      return [booking.name, booking.email, booking.phoneNumber, booking.courseName, booking.country, booking.parentName]
        .some(v => (v || '').toLowerCase().includes(term));
    });
  }, [bookings, searchTerm, statusFilter]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const fetchedBookings = await getDemoBookings();
      setBookings(fetchedBookings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch demo bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    setStats(await getDemoBookingStats());
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: DemoBooking['status']) => {
    try {
      const updatedBooking = await updateDemoBookingStatus(bookingId, newStatus);
      setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
      fetchStats();
      setIsModalOpen(false);
      setSelectedBooking(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update booking status');
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (window.confirm('Are you sure you want to delete this demo booking?')) {
      try {
        await deleteDemoBooking(bookingId);
        setBookings(prev => prev.filter(b => b.id !== bookingId));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(bookingId);
          return next;
        });
        fetchStats();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete booking');
      }
    }
  };

  const openManageModal = (booking: DemoBooking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  // Selection follows the visible (filtered) rows
  const selectedVisible = filteredBookings.filter(b => selectedIds.has(b.id));
  const allVisibleSelected = filteredBookings.length > 0 && selectedVisible.length === filteredBookings.length;

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(filteredBookings.map(b => b.id)));
  };

  const openShare = (list: DemoBooking[]) => {
    if (list.length === 0) return;
    setCopied(false);
    setShareList(list);
  };

  const shareText = shareList ? buildShareText(shareList) : '';
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
    setShareList(null);
  };

  const shareToOtherApps = async () => {
    try {
      await navigator.share({ title: 'Demo bookings', text: shareText });
      setShareList(null);
    } catch {
      // user closed the share sheet — keep the dialog open
    }
  };

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    } catch {
      alert('Could not copy. Please select the text and copy it manually.');
    }
  };

  const getStatusColor = (status: DemoBooking['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const muted = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const strong = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const panel = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const thClass = `px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`;

  if (isLoading) {
    return (
      <AdminLayout>
        <AdminPageHeader
          title="Demo Bookings"
          subtitle="Manage demo class booking requests"
        />
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading demo bookings...</p>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { label: 'Total', value: stats.total, color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Pending', value: stats.pending, color: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Confirmed', value: stats.confirmed, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Completed', value: stats.completed, color: 'text-green-600 dark:text-green-400' },
    { label: 'Cancelled', value: stats.cancelled, color: 'text-red-600 dark:text-red-400' },
    { label: 'This Month', value: stats.thisMonth, color: 'text-indigo-600 dark:text-indigo-400' },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Demo Bookings"
        subtitle="Manage demo class booking requests"
      />

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {statCards.map(card => (
              <div key={card.label} className={`p-4 rounded-lg border ${panel}`}>
                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className={`mb-4 p-4 rounded-lg border ${panel}`}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, email, or course..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>

              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Share bar */}
          {filteredBookings.length > 0 && (
            <div className={`mb-4 px-4 py-3 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-3 ${panel}`}>
              <div className={`text-sm flex-1 ${muted}`}>
                {selectedVisible.length > 0
                  ? `${selectedVisible.length} of ${filteredBookings.length} selected`
                  : 'Tick bookings to share only those, or share them all.'}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedVisible.length > 0 && (
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => openShare(selectedVisible)}
                  disabled={selectedVisible.length === 0}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckSquare className="w-4 h-4" />
                  Share selected{selectedVisible.length > 0 ? ` (${selectedVisible.length})` : ''}
                </button>
                <button
                  onClick={() => openShare(filteredBookings)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share all ({filteredBookings.length})
                </button>
              </div>
            </div>
          )}

          {/* Bookings List */}
          <div className={`rounded-lg border overflow-hidden ${panel}`}>
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-medium mb-2 ${strong}`}>
                  No demo bookings found
                </h3>
                <p className={muted}>
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Demo booking requests will appear here when customers book demo classes.'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`${thClass} w-10`}>
                        <input
                          type="checkbox"
                          aria-label="Select all bookings"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 accent-purple-600 cursor-pointer"
                        />
                      </th>
                      <th className={thClass}>Student Details</th>
                      <th className={thClass}>Course & Status</th>
                      <th className={thClass}>Booked On</th>
                      <th className={thClass}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {filteredBookings.map((booking) => {
                      const isSelected = selectedIds.has(booking.id);
                      return (
                      <motion.tr
                        key={booking.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`transition-colors ${
                          isSelected
                            ? (theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50')
                            : (theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50')
                        }`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${booking.name}`}
                            checked={isSelected}
                            onChange={() => toggleSelected(booking.id)}
                            className="w-4 h-4 accent-purple-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="ml-4">
                              <div className={`text-sm font-medium ${strong}`}>
                                {booking.name || 'Unknown'}
                              </div>
                              <div className={`text-sm flex items-center gap-4 ${muted}`}>
                                {booking.phoneNumber && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-4 h-4" />
                                    {booking.phoneNumber}
                                  </span>
                                )}
                                {booking.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-4 h-4" />
                                    {booking.email}
                                  </span>
                                )}
                                {booking.country && (
                                  <span className="flex items-center gap-1">
                                    <Globe className="w-4 h-4" />
                                    {booking.country}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${strong}`}>
                            {booking.courseName || '—'}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                            {capitalize(booking.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${strong}`}>
                            {formatBookedDate(booking.createdAt)}
                          </div>
                          <div className={`text-xs ${muted}`}>
                            {formatBookedTime(booking.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openManageModal(booking)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Manage
                            </button>
                            <button
                              onClick={() => openShare([booking])}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Share
                            </button>
                            <button
                              onClick={() => handleDelete(booking.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        {/* Share Dialog */}
        {shareList && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`w-full max-w-md rounded-2xl shadow-2xl border ${panel}`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${strong}`}>
                    Share {shareList.length === 1 ? '1 booking' : `${shareList.length} bookings`}
                  </h3>
                  <button
                    onClick={() => setShareList(null)}
                    className={`p-2 rounded-full transition-colors ${
                      theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <pre className={`text-xs whitespace-pre-wrap max-h-60 overflow-y-auto p-3 rounded-lg mb-4 font-sans ${
                  theme === 'dark' ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'
                }`}>
                  {shareText}
                </pre>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={shareToWhatsApp}
                    className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </button>
                  {canNativeShare && (
                    <button
                      onClick={shareToOtherApps}
                      className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                      Other apps
                    </button>
                  )}
                  <button
                    onClick={copyShareText}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium border transition-colors ${
                      theme === 'dark' ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Copy className="w-5 h-5" />
                    {copied ? 'Copied!' : 'Copy text'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Management Modal */}
        {isModalOpen && selectedBooking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`w-full max-w-md rounded-2xl shadow-2xl border ${panel}`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${strong}`}>
                    Manage Demo Booking
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className={`p-2 rounded-full transition-colors ${
                      theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
                    {([
                      ['Student', selectedBooking.name],
                      ['Parent', selectedBooking.parentName],
                      ['Course', selectedBooking.courseName],
                      ['Phone', selectedBooking.phoneNumber],
                      ['Email', selectedBooking.email],
                      ['Country', selectedBooking.country],
                      ['Preferred', [selectedBooking.preferredDate, selectedBooking.preferredTime].filter(Boolean).join(' ')],
                      ['Booked on', `${formatBookedDate(selectedBooking.createdAt)}, ${formatBookedTime(selectedBooking.createdAt)}`],
                      ['Status', capitalize(selectedBooking.status)],
                    ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                      <React.Fragment key={label}>
                        <dt className={muted}>{label}</dt>
                        <dd className={`${strong} break-words`}>{value}</dd>
                      </React.Fragment>
                    ))}
                  </dl>

                  {selectedBooking.message && (
                    <div className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${
                      theme === 'dark' ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'
                    }`}>
                      {selectedBooking.message}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleStatusUpdate(selectedBooking.id, 'confirmed')}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedBooking.id, 'completed')}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedBooking.id, 'cancelled')}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { setIsModalOpen(false); openShare([selectedBooking]); }}
                      className={`px-4 py-2 rounded-lg font-medium border transition-colors ${
                        theme === 'dark' ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
    </AdminLayout>
  );
};

export default DemoBookingsManagementPage;
