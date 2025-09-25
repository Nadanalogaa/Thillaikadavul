import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Globe, Edit3, Save, AlertCircle, CheckCircle } from 'lucide-react';
import type { User as UserType } from '../../types';
import { updateUserProfile, getCurrentUser } from '../../api';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { COUNTRIES } from '../../constants';
import BeautifulLoader from '../../components/BeautifulLoader';
import DashboardHeader from '../../components/DashboardHeader';

const getGuardianEmail = (email?: string): string => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const username = parts[0].split('+')[0];
    return `${username}@${parts[1]}`;
};

const GuardianProfilePage: React.FC = () => {
    const { theme } = useTheme();
    const { user, onUpdate } = useOutletContext<{ user: UserType, onUpdate: (user: UserType) => void }>();
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [formData, setFormData] = useState<Partial<UserType>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const loadUserData = async () => {
            setInitialLoading(true);
            try {
                const userData = await getCurrentUser();
                setCurrentUser(userData);
                if (user) {
                    setFormData(user);
                } else if (userData) {
                    setFormData(userData);
                }
            } catch (err) {
                console.error('Failed to load user data:', err);
                setError('Failed to load profile data.');
            } finally {
                setInitialLoading(false);
            }
        };
        loadUserData();
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (error) setError(null);
        if (success) setSuccess(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const updatedUser = await updateUserProfile(formData);
            if (onUpdate) {
                onUpdate(updatedUser);
            }
            setCurrentUser(updatedUser);
            setSuccess('Profile updated successfully!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <BeautifulLoader message="Loading profile..." />
            </div>
        );
    }

    const displayUser = currentUser || user;

    return (
        <DashboardHeader 
            userName={displayUser?.name || 'Guardian'} 
            userRole="Guardian"
            pageTitle="Guardian Profile"
            pageSubtitle="Manage your account information and preferences"
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

                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-3 rounded-2xl border p-4 mb-6 ${
                            theme === 'dark' 
                                ? 'border-green-800/60 bg-green-900/30 text-green-200' 
                                : 'border-green-200 bg-green-50/70 text-green-600'
                        }`}
                    >
                        <CheckCircle className="w-5 h-5" />
                        <p className="text-sm">{success}</p>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl shadow-lg border backdrop-blur-sm ${
                        theme === 'dark' 
                            ? 'bg-gray-800/90 border-gray-700/50' 
                            : 'bg-white/90 border-purple-200/50'
                    }`}
                >
                    {/* Profile Header */}
                    <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                    <User className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-400 border-3 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                            </div>
                            <div>
                                <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                                    {formData.fatherName || displayUser?.fatherName || 'Guardian Name'}
                                </h2>
                                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-lg`}>
                                    {getGuardianEmail(formData.email || displayUser?.email)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="space-y-8">
                            {/* Personal Information */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Personal Information
                                    </h3>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={`block text-sm font-semibold mb-2 ${
                                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Guardian's Full Name
                                        </label>
                                        <input 
                                            name="fatherName" 
                                            value={formData.fatherName || ''} 
                                            onChange={handleChange} 
                                            required 
                                            className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                                theme === 'dark' 
                                                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:bg-gray-700/70' 
                                                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
                                            }`}
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className={`block text-sm font-semibold mb-2 ${
                                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="email" 
                                                value={getGuardianEmail(formData.email || displayUser?.email)} 
                                                disabled 
                                                className={`w-full px-4 py-3 pl-12 rounded-xl border transition-all duration-200 ${
                                                    theme === 'dark' 
                                                        ? 'bg-gray-800/50 border-gray-600/50 text-gray-400' 
                                                        : 'bg-gray-100/50 border-gray-300 text-gray-500'
                                                }`}
                                            />
                                            <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                            }`} />
                                        </div>
                                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Email cannot be changed
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Contact Information */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <Phone className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Contact Information
                                    </h3>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={`block text-sm font-semibold mb-2 ${
                                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Primary Contact Number
                                        </label>
                                        <input 
                                            name="contactNumber" 
                                            value={formData.contactNumber || ''} 
                                            onChange={handleChange} 
                                            required 
                                            className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                                theme === 'dark' 
                                                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:bg-gray-700/70' 
                                                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
                                            }`}
                                            placeholder="Enter primary contact number"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className={`block text-sm font-semibold mb-2 ${
                                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Alternate Contact Number
                                        </label>
                                        <input 
                                            name="alternateContactNumber" 
                                            value={formData.alternateContactNumber || ''} 
                                            onChange={handleChange} 
                                            className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                                theme === 'dark' 
                                                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:bg-gray-700/70' 
                                                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
                                            }`}
                                            placeholder="Enter alternate contact number (optional)"
                                        />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Address Information */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <MapPin className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        Address Information
                                    </h3>
                                </div>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className={`block text-sm font-semibold mb-2 ${
                                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Full Address
                                        </label>
                                        <textarea 
                                            name="address" 
                                            value={formData.address || ''} 
                                            onChange={handleChange} 
                                            rows={3} 
                                            className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                                theme === 'dark' 
                                                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:bg-gray-700/70 resize-none' 
                                                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white resize-none'
                                            }`}
                                            placeholder="Enter your complete address"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={`block text-sm font-semibold mb-2 ${
                                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                Country
                                            </label>
                                            <div className="relative">
                                                <select 
                                                    name="country" 
                                                    value={formData.country || ''} 
                                                    onChange={handleChange} 
                                                    required 
                                                    className={`w-full px-4 py-3 pl-12 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none ${
                                                        theme === 'dark' 
                                                            ? 'bg-gray-700/50 border-gray-600/50 text-white focus:bg-gray-700/70' 
                                                            : 'bg-white/50 border-gray-300 text-gray-900 focus:bg-white'
                                                    }`}
                                                >
                                                    <option value="">Select Country</option>
                                                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <Globe className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                                                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                                }`} />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className={`block text-sm font-semibold mb-2 ${
                                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                State / Province
                                            </label>
                                            <input 
                                                name="state" 
                                                value={formData.state || ''} 
                                                onChange={handleChange} 
                                                required 
                                                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                                    theme === 'dark' 
                                                        ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:bg-gray-700/70' 
                                                        : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
                                                }`}
                                                placeholder="Enter state or province"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className={`block text-sm font-semibold mb-2 ${
                                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                City / Location
                                            </label>
                                            <input 
                                                name="city" 
                                                value={formData.city || ''} 
                                                onChange={handleChange} 
                                                required 
                                                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                                    theme === 'dark' 
                                                        ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:bg-gray-700/70' 
                                                        : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
                                                }`}
                                                placeholder="Enter city or location"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className={`block text-sm font-semibold mb-2 ${
                                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                Postal Code
                                            </label>
                                            <input 
                                                name="postalCode" 
                                                value={formData.postalCode || ''} 
                                                onChange={handleChange} 
                                                required 
                                                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                                    theme === 'dark' 
                                                        ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:bg-gray-700/70' 
                                                        : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
                                                }`}
                                                placeholder="Enter postal code"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Save Button */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className={`pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                            >
                                <button 
                                    type="submit" 
                                    disabled={isLoading} 
                                    className="w-full flex justify-center items-center gap-3 py-4 px-6 border border-transparent rounded-xl shadow-lg text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            <span>Saving Changes...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        </div>
                    </form>
                </motion.div>
            </div>
        </DashboardHeader>
    );
};

export default GuardianProfilePage;