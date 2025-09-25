import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CreditCard, DollarSign, User, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import type { Invoice, User as UserType } from '../../types';
import { InvoiceStatus } from '../../types';
import { getFamilyStudents, getStudentInvoicesForFamily, getCurrentUser } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import BeautifulLoader from '../../components/BeautifulLoader';
import DashboardHeader from '../../components/DashboardHeader';

const getStatusBadgeClass = (status: InvoiceStatus, theme: string) => {
    switch (status) {
        case InvoiceStatus.Paid: 
            return theme === 'dark' 
                ? 'bg-green-900/50 text-green-300 border-green-700/50' 
                : 'bg-green-100 text-green-800 border-green-200';
        case InvoiceStatus.Pending: 
            return theme === 'dark' 
                ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' 
                : 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case InvoiceStatus.Overdue: 
            return theme === 'dark' 
                ? 'bg-red-900/50 text-red-300 border-red-700/50' 
                : 'bg-red-100 text-red-800 border-red-200';
        default: 
            return theme === 'dark' 
                ? 'bg-gray-800/50 text-gray-400 border-gray-600/50' 
                : 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
        case InvoiceStatus.Paid: return CheckCircle;
        case InvoiceStatus.Pending: return Clock;
        case InvoiceStatus.Overdue: return AlertCircle;
        default: return FileText;
    }
};

const PaymentHistoryPage: React.FC = () => {
    const { theme } = useTheme();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');

    useEffect(() => {
        const fetchInvoices = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [user, family] = await Promise.all([
                    getCurrentUser(),
                    getFamilyStudents()
                ]);
                
                setCurrentUser(user);
                
                const invoicePromises = family.map(student => getStudentInvoicesForFamily(student.id));
                const results = await Promise.all(invoicePromises);
                const allInvoices = results.flat().sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
                
                // Manually populate student names since server doesn't for this route
                const familyMap = new Map(family.map(f => [f.id, f.name]));
                const populatedInvoices = allInvoices.map(inv => ({
                    ...inv,
                    student: { id: inv.studentId, name: familyMap.get(inv.studentId) || 'Unknown', email: ''}
                }));

                setInvoices(populatedInvoices);
            } catch (err) {
                console.error("Failed to fetch payment history:", err);
                setError('Failed to load payment history. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <BeautifulLoader message="Loading payment history..." />
            </div>
        );
    }

    const filteredInvoices = invoices.filter(invoice => {
        if (filter === 'all') return true;
        return invoice.status.toLowerCase() === filter;
    });

    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidAmount = invoices.filter(inv => inv.status === InvoiceStatus.Paid).reduce((sum, inv) => sum + inv.amount, 0);
    const pendingAmount = invoices.filter(inv => inv.status !== InvoiceStatus.Paid).reduce((sum, inv) => sum + inv.amount, 0);

    return (
        <DashboardHeader 
            userName={currentUser?.name || 'Guardian'} 
            userRole="Guardian"
            pageTitle="Payment History"
            pageSubtitle="Track your invoices and payment records"
        >
            <div className="px-4 sm:px-6 md:px-8">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-3 rounded-2xl border p-4 mb-6 ${
                            theme === 'dark' 
                                ? 'border-red-800/60 bg-red-900/30 text-red-200' 
                                : 'border-red-200 bg-red-50/70 text-red-600'
                        }`}
                    >
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">{error}</p>
                    </motion.div>
                )}

                {/* Summary Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                >
                    <div className={`rounded-2xl p-6 shadow-lg border backdrop-blur-sm ${
                        theme === 'dark' 
                            ? 'bg-gray-800/90 border-gray-700/50' 
                            : 'bg-white/90 border-blue-200/50'
                    }`}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Total Amount
                                </p>
                                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    ₹{totalAmount.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={`rounded-2xl p-6 shadow-lg border backdrop-blur-sm ${
                        theme === 'dark' 
                            ? 'bg-gray-800/90 border-gray-700/50' 
                            : 'bg-white/90 border-green-200/50'
                    }`}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Paid Amount
                                </p>
                                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    ₹{paidAmount.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={`rounded-2xl p-6 shadow-lg border backdrop-blur-sm ${
                        theme === 'dark' 
                            ? 'bg-gray-800/90 border-gray-700/50' 
                            : 'bg-white/90 border-orange-200/50'
                    }`}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Pending Amount
                                </p>
                                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    ₹{pendingAmount.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Filter Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className={`flex space-x-1 p-1 rounded-xl shadow-lg border backdrop-blur-sm ${
                        theme === 'dark' 
                            ? 'bg-gray-800/90 border-gray-700/50' 
                            : 'bg-white/90 border-purple-200/50'
                    }`}>
                        {([
                            { key: 'all', label: 'All' },
                            { key: 'paid', label: 'Paid' },
                            { key: 'pending', label: 'Pending' },
                            { key: 'overdue', label: 'Overdue' }
                        ] as const).map((filterOption) => (
                            <button
                                key={filterOption.key}
                                onClick={() => setFilter(filterOption.key)}
                                className={`flex-1 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                    filter === filterOption.key
                                        ? 'bg-indigo-600 text-white shadow-lg transform scale-105'
                                        : `${theme === 'dark' ? 'text-gray-300 hover:text-indigo-400 hover:bg-gray-700/50' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'}`
                                }`}
                            >
                                {filterOption.label}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Invoices List */}
                {filteredInvoices.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        {filteredInvoices.map((invoice, index) => {
                            const StatusIcon = getStatusIcon(invoice.status);
                            return (
                                <motion.div
                                    key={invoice.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`rounded-2xl shadow-lg border backdrop-blur-sm p-6 ${
                                        theme === 'dark' 
                                            ? 'bg-gray-800/90 border-gray-700/50' 
                                            : 'bg-white/90 border-purple-200/50'
                                    }`}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                                <CreditCard className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                                    <h3 className={`text-lg font-bold ${
                                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                                    }`}>
                                                        {invoice.courseName}
                                                    </h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                                        getStatusBadgeClass(invoice.status, theme)
                                                    } flex items-center gap-1`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {invoice.status}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                                    <div className={`flex items-center gap-2 ${
                                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>
                                                        <User className="w-4 h-4" />
                                                        <span>{invoice.student?.name}</span>
                                                    </div>
                                                    <div className={`flex items-center gap-2 ${
                                                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className={`flex items-center gap-2 font-semibold ${
                                                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                                                    }`}>
                                                        <DollarSign className="w-4 h-4" />
                                                        <span>{invoice.amount} {invoice.currency}</span>
                                                    </div>
                                                    {invoice.paymentDetails && (
                                                        <div className={`flex items-center gap-2 ${
                                                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                        }`}>
                                                            <CheckCircle className="w-4 h-4" />
                                                            <span>Paid: {new Date(invoice.paymentDetails.paymentDate).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`text-center py-20 rounded-2xl shadow-lg border backdrop-blur-sm ${
                            theme === 'dark' 
                                ? 'bg-gray-800/90 border-gray-700/50' 
                                : 'bg-white/90 border-gray-100'
                        }`}
                    >
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-full mx-auto mb-6 flex items-center justify-center">
                            <CreditCard className={`w-12 h-12 ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                            }`} />
                        </div>
                        <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}>
                            No Payment Records Found
                        </h3>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-lg max-w-md mx-auto`}>
                            {filter === 'all' 
                                ? "No payment history available at this time."
                                : `No ${filter} payments found. Try adjusting your filter.`
                            }
                        </p>
                    </motion.div>
                )}
            </div>
        </DashboardHeader>
    );
};

export default PaymentHistoryPage;