import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import {
    DashboardIcon, UsersIcon, BatchesIcon, MapPinIcon, FeesIcon, CalendarIcon,
    CertificateIcon, BookIcon, MegaphoneIcon, TrashIcon, XIcon, DemoClassIcon, ArrowLeftIcon
} from '../icons';
import Tooltip from '../Tooltip';

interface AdminSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
    const { theme } = useTheme();

    const links = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: DashboardIcon },
        { name: 'Students', path: '/admin/students', icon: UsersIcon },
        { name: 'Teachers', path: '/admin/teachers', icon: UsersIcon },
        { name: 'Batches', path: '/admin/batches', icon: BatchesIcon },
        { name: 'Locations', path: '/admin/locations', icon: MapPinIcon },
        { name: 'Fees', path: '/admin/fees', icon: FeesIcon },
        { name: 'Demo Bookings', path: '/admin/demo-bookings', icon: DemoClassIcon },
        { name: 'Events', path: '/admin/events', icon: CalendarIcon },
        { name: 'Grade Exams', path: '/admin/grade-exams', icon: CertificateIcon },
        { name: 'Book Materials', path: '/admin/book-materials', icon: BookIcon },
        { name: 'Notices', path: '/admin/notices', icon: MegaphoneIcon },
        { name: 'Trash', path: '/admin/trash', icon: TrashIcon },
    ];

    const sidebarClasses = `
        fixed top-0 left-0 z-30 h-full w-64
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
        border-r
        ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
    `;

    const linkClasses = (isActive: boolean) => `
        flex items-center px-3 py-2 text-sm font-medium rounded-md mx-2 my-0.5
        transition-all duration-150
        ${isActive
            ? 'bg-brand-primary text-white'
            : theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-brand-primary'
        }
    `;

    return (
        <aside className={sidebarClasses}>
            {/* Sidebar Header - Compact */}
            <div className={`flex items-center justify-between px-3 py-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-2">
                    <Tooltip content="Back to Home" position="right">
                        <Link
                            to="/"
                            className={`p-1.5 rounded-md ${theme === 'dark'
                                ? 'hover:bg-gray-700 text-gray-400'
                                : 'hover:bg-gray-100 text-gray-600'
                                }`}
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                        </Link>
                    </Tooltip>
                    <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Admin
                    </h2>
                </div>
                <button
                    onClick={onClose}
                    className={`lg:hidden p-1.5 rounded-md ${theme === 'dark'
                        ? 'hover:bg-gray-700 text-gray-400'
                        : 'hover:bg-gray-100 text-gray-600'
                        }`}
                >
                    <XIcon className="h-4 w-4" />
                </button>
            </div>

            {/* Navigation Links - Compact */}
            <nav className="flex-1 overflow-y-auto py-3 px-1">
                <div className="space-y-0.5">
                    {links.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            end={link.path === '/admin/dashboard'}
                            onClick={onClose}
                            className={({ isActive }) => linkClasses(isActive)}
                        >
                            <link.icon className="h-4 w-4 mr-2.5 flex-shrink-0" />
                            <span className="truncate text-sm">{link.name}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Footer - Minimal */}
            <div className={`px-3 py-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    v1.0
                </p>
            </div>
        </aside>
    );
};

export default AdminSidebar;
