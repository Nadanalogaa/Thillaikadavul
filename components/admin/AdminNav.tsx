
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    DashboardIcon, UsersIcon, BatchesIcon, MapPinIcon, FeesIcon, CalendarIcon, 
    CertificateIcon, BookIcon, MegaphoneIcon, TrashIcon, MenuIcon, XIcon 
} from '../icons';

const AdminNav: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const links = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: DashboardIcon },
        { name: 'Students', path: '/admin/students', icon: UsersIcon },
        { name: 'Teachers', path: '/admin/teachers', icon: UsersIcon },
        { name: 'Batches', path: '/admin/batches', icon: BatchesIcon },
        { name: 'Locations', path: '/admin/locations', icon: MapPinIcon },
        { name: 'Fees', path: '/admin/fees', icon: FeesIcon },
        { name: 'Events', path: '/admin/events', icon: CalendarIcon },
        { name: 'Media', path: '/admin/media', icon: BookIcon },
        { name: 'Grade Exams', path: '/admin/grade-exams', icon: CertificateIcon },
        { name: 'Book Materials', path: '/admin/book-materials', icon: BookIcon },
        { name: 'Notices', path: '/admin/notices', icon: MegaphoneIcon },
        { name: 'Trash', path: '/admin/trash', icon: TrashIcon },
    ];

    const linkClasses = "flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-md transition-colors";
    const activeLinkClasses = "bg-brand-primary text-white";
    const inactiveLinkClasses = "text-gray-600 hover:bg-brand-light/50 hover:text-brand-primary";

    const NavLinkItem: React.FC<{ link: typeof links[0], onClick?: () => void }> = ({ link, onClick }) => (
        <NavLink
            to={link.path}
            end={link.path === '/admin/dashboard'}
            onClick={onClick}
            className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
        >
            <link.icon className="h-5 w-5" />
            <span>{link.name}</span>
        </NavLink>
    );

    return (
        <div className="bg-white rounded-lg shadow-sm p-2 my-6 relative">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1 overflow-x-auto">
                {links.map(link => (
                    <div key={link.name} className="flex-shrink-0">
                        <NavLinkItem link={link} />
                    </div>
                ))}
            </nav>

            {/* Mobile Navigation */}
            <div className="md:hidden">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-md hover:bg-brand-light/50"
                >
                    <div className="flex items-center space-x-3">
                        {isMenuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
                        <span>Menu</span>
                    </div>
                </button>

                {isMenuOpen && (
                    <nav className="absolute top-full left-0 w-full mt-1 bg-white rounded-md shadow-lg border z-20 p-2">
                        <div className="flex flex-col space-y-1">
                            {links.map(link => (
                                <NavLinkItem key={link.name} link={link} onClick={() => setIsMenuOpen(false)} />
                            ))}
                        </div>
                    </nav>
                )}
            </div>
        </div>
    );
};

export default AdminNav;
