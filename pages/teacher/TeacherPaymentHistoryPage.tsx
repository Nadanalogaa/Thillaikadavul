import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useOutletContext } from 'react-router-dom';
import { 
    CreditCard, 
    Clock, 
    Calendar,
    DollarSign,
    Filter,
    Search,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    TrendingUp,
    BarChart3,
    CheckCircle,
    XCircle,
    AlertCircle,
    Users,
    BookOpen,
    Wallet,
    PieChart
} from 'lucide-react';
import type { User, Batch } from '../../types';
import { getBatches } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import BeautifulLoader from '../../components/BeautifulLoader';

// Mock payment data structure - replace with actual API call
interface Payment {
    id: string;
    amount: number;
    currency: string;
    status: 'Paid' | 'Pending' | 'Failed';
    paymentDate: string;
    paymentMethod: string;
    batchName: string;
    courseName: string;
    month: string;
    year: number;
    studentCount: number;
    description?: string;
}

const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
        'Paid': 'from-green-500 to-emerald-500',
        'Pending': 'from-yellow-500 to-orange-500',
        'Failed': 'from-red-500 to-pink-500'
    };
    return colorMap[status] || 'from-gray-500 to-gray-600';
};

const getStatusIcon = (status: string) => {
    const iconMap: Record<string, React.ElementType> = {
        'Paid': CheckCircle,
        'Pending': AlertCircle,
        'Failed': XCircle
    };
    return iconMap[status] || AlertCircle;
};

const getStatusBg = (status: string, theme: string) => {
    const bgMap: Record<string, string> = {
        'Paid': theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50',
        'Pending': theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50',
        'Failed': theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
    };
    return bgMap[status] || (theme === 'dark' ? 'bg-gray-900/20' : 'bg-gray-50');
};

// Mock function to generate payment data - replace with actual API
const generateMockPayments = (batches: Batch[]): Payment[] => {
    const payments: Payment[] = [];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const statuses: ('Paid' | 'Pending' | 'Failed')[] = ['Paid', 'Paid', 'Paid', 'Pending', 'Paid'];
    const paymentMethods = ['Bank Transfer', 'Direct Deposit', 'Cheque', 'Digital Wallet'];
    
    batches.forEach(batch => {
        const studentCount = batch.schedule.reduce((total, schedule) => total + schedule.studentIds.length, 0);
        const baseAmount = studentCount * 200; // Base salary per student
        
        // Generate payments for last 6 months
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            
            payments.push({
                id: `payment-${batch.id}-${i}`,
                amount: baseAmount + (Math.random() * 100 - 50), // Small variation
                currency: 'USD',
                status: statuses[Math.floor(Math.random() * statuses.length)],
                paymentDate: date.toISOString(),
                paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                batchName: batch.name,
                courseName: batch.courseName,
                month: months[date.getMonth()],
                year: date.getFullYear(),
                studentCount,
                description: `Teaching salary for ${batch.name} - ${months[date.getMonth()]} ${date.getFullYear()}`
            });
        }
    });
    
    return payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
};

const TeacherPaymentHistoryPage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>();
    const { theme } = useTheme();
    const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [paymentsRef, paymentsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    const [statsRef, statsInView] = useInView({ threshold: 0.1, triggerOnce: true });
    
    const [payments, setPayments] = useState<Payment[]>([]);
    const [teacherBatches, setTeacherBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [currentPage, setCurrentPage] = useState(1);
    const paymentsPerPage = 8;

    useEffect(() => {
        const fetchPaymentData = async () => {
            // Wait for user to be available with ID
            if (!user?.id) {
                setIsLoading(true);
                return;
            }
            
            try {
                setIsLoading(true);
                
                console.log('Loading payment history data for teacher:', user.name);
                
                const batchesData = await getBatches();
                
                // Filter batches where this teacher is assigned
                const filteredTeacherBatches = batchesData.filter(batch => {
                    const teacherId = typeof batch.teacherId === 'string' ? batch.teacherId : (batch.teacherId as User)?.id;
                    return teacherId === user.id;
                });
                
                // Generate mock payment data
                const mockPayments = generateMockPayments(filteredTeacherBatches);
                
                setTeacherBatches(filteredTeacherBatches);
                setPayments(mockPayments);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch payment data:", err);
                setError(err instanceof Error ? err.message : 'Failed to fetch payment data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPaymentData();
    }, [user?.id]); // Only re-run when user ID changes

    if (isLoading) {
        return <BeautifulLoader message="Loading payment history..." />;
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <div className="text-red-500 bg-red-100 dark:bg-red-900/20 p-4 rounded-lg">
                    Error: {error}
                </div>
            </div>
        );
    }

    // Filter payments based on search and status
    const filteredPayments = payments.filter(payment => {
        const matchesSearch = payment.batchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            payment.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            payment.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || payment.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    // Pagination
    const indexOfLastPayment = currentPage * paymentsPerPage;
    const indexOfFirstPayment = indexOfLastPayment - paymentsPerPage;
    const currentPayments = filteredPayments.slice(indexOfFirstPayment, indexOfLastPayment);
    const totalPages = Math.ceil(filteredPayments.length / paymentsPerPage);

    // Calculate statistics
    const totalEarnings = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);
    const thisMonthEarnings = payments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        const now = new Date();
        return p.status === 'Paid' && 
               paymentDate.getMonth() === now.getMonth() && 
               paymentDate.getFullYear() === now.getFullYear();
    }).reduce((sum, p) => sum + p.amount, 0);

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 p-6">
            {/* Hero Section */}
            <motion.section
                ref={heroRef}
                initial={{ opacity: 0, y: 30 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8 }}
                className="text-center mb-8"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="mb-6"
                >
                    <Wallet className="w-16 h-16 mx-auto mb-4 text-purple-600 dark:text-purple-400" />
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                        Payment History
                    </h1>
                    <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                        Track your teaching earnings and payment history
                    </p>
                </motion.div>
            </motion.section>

            {/* Statistics Cards */}
            <motion.section
                ref={statsRef}
                initial={{ opacity: 0, y: 30 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-6xl mx-auto"
            >
                {[
                    {
                        title: "Total Earnings",
                        value: formatCurrency(totalEarnings),
                        icon: DollarSign,
                        gradient: "from-green-500 to-emerald-500",
                        bg: "bg-green-50 dark:bg-green-900/20"
                    },
                    {
                        title: "This Month",
                        value: formatCurrency(thisMonthEarnings),
                        icon: TrendingUp,
                        gradient: "from-blue-500 to-indigo-500",
                        bg: "bg-blue-50 dark:bg-blue-900/20"
                    },
                    {
                        title: "Pending Payments",
                        value: formatCurrency(pendingPayments),
                        icon: AlertCircle,
                        gradient: "from-yellow-500 to-orange-500",
                        bg: "bg-yellow-50 dark:bg-yellow-900/20"
                    }
                ].map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={statsInView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        className={`p-6 rounded-2xl border backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 ${
                            theme === 'dark' 
                                ? 'bg-gray-800/60 border-gray-600/30' 
                                : 'bg-white/80 border-white/70'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {stat.title}
                                </p>
                                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {stat.value}
                                </p>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.bg}`}>
                                <stat.icon className={`w-6 h-6 bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.section>

            {/* Search and Filter */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col md:flex-row gap-4 mb-8 max-w-4xl mx-auto"
            >
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search payments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border backdrop-blur-sm transition-all duration-300 ${
                            theme === 'dark' 
                                ? 'bg-gray-800/60 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500' 
                                : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className={`pl-10 pr-8 py-3 rounded-xl border backdrop-blur-sm appearance-none cursor-pointer transition-all duration-300 ${
                            theme === 'dark' 
                                ? 'bg-gray-800/60 border-gray-600 text-white focus:border-purple-500' 
                                : 'bg-white/80 border-gray-200 text-gray-900 focus:border-purple-500'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                        <option value="All">All Status</option>
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Failed">Failed</option>
                    </select>
                </div>
            </motion.div>

            {/* Payments Table */}
            <motion.section
                ref={paymentsRef}
                initial={{ opacity: 0, y: 50 }}
                animate={paymentsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1 }}
                className="max-w-7xl mx-auto"
            >
                {currentPayments.length > 0 ? (
                    <>
                        <div className="space-y-4 mb-8">
                            {currentPayments.map((payment, index) => {
                                const StatusIcon = getStatusIcon(payment.status);
                                const statusGradient = getStatusColor(payment.status);
                                const statusBg = getStatusBg(payment.status, theme);
                                
                                return (
                                    <motion.div
                                        key={payment.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={paymentsInView ? { opacity: 1, x: 0 } : {}}
                                        transition={{ duration: 0.6, delay: index * 0.05 }}
                                        whileHover={{ scale: 1.01, x: 5 }}
                                        className={`p-6 rounded-2xl border backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 ${
                                            theme === 'dark' 
                                                ? 'bg-gray-800/60 border-gray-600/30' 
                                                : 'bg-white/80 border-white/70'
                                        } ${statusBg}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4 flex-1">
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${statusGradient} flex items-center justify-center shadow-lg`}>
                                                    <StatusIcon className="w-6 h-6 text-white" />
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                                {formatCurrency(payment.amount, payment.currency)}
                                                            </h3>
                                                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                {payment.batchName} • {payment.courseName}
                                                            </p>
                                                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                                                                {payment.description}
                                                            </p>
                                                        </div>
                                                        
                                                        <div className="text-right ml-4">
                                                            <div className="flex items-center space-x-2 mb-2">
                                                                <span className={`px-3 py-1 bg-gradient-to-r ${statusGradient} text-white text-xs font-semibold rounded-full shadow-md`}>
                                                                    {payment.status}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center space-x-4 text-sm">
                                                                <div className="flex items-center space-x-1">
                                                                    <Calendar className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                                                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                        {formatDate(payment.paymentDate)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center space-x-1">
                                                                    <Users className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                                                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                        {payment.studentCount} students
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                                                                via {payment.paymentMethod}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center space-x-2 ml-4">
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={`p-2 rounded-lg transition-all duration-300 ${
                                                        theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                                    }`}
                                                    title="View Details"
                                                >
                                                    <Eye className="w-5 h-5 text-gray-500" />
                                                </motion.button>
                                                
                                                {payment.status === 'Paid' && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        className={`p-2 rounded-lg transition-all duration-300 ${
                                                            theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                                        }`}
                                                        title="Download Receipt"
                                                    >
                                                        <Download className="w-5 h-5 text-gray-500" />
                                                    </motion.button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={paymentsInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.4 }}
                                className="flex justify-center items-center space-x-4"
                            >
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-lg transition-all duration-300 ${
                                        currentPage === 1
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : theme === 'dark'
                                                ? 'text-gray-300 hover:bg-gray-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                
                                <div className="flex space-x-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-lg font-semibold transition-all duration-300 ${
                                                currentPage === page
                                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                                                    : theme === 'dark'
                                                        ? 'text-gray-300 hover:bg-gray-700'
                                                        : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-lg transition-all duration-300 ${
                                        currentPage === totalPages
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : theme === 'dark'
                                                ? 'text-gray-300 hover:bg-gray-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </motion.div>
                        )}
                    </>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={paymentsInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className={`text-center py-16 rounded-3xl ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} border-2 border-dashed ${theme === 'dark' ? 'border-gray-600' : 'border-purple-200'} backdrop-blur-sm`}
                    >
                        <CreditCard className={`w-20 h-20 mx-auto mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            No Payment History
                        </h3>
                        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} max-w-md mx-auto`}>
                            {searchTerm || filterStatus !== 'All' 
                                ? 'Try adjusting your search or filter to find payments.'
                                : 'Your payment history will appear here once you receive payments for teaching.'
                            }
                        </p>
                    </motion.div>
                )}
            </motion.section>
        </div>
    );
};

export default TeacherPaymentHistoryPage;