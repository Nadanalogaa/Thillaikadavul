
import React, { useState, useEffect } from 'react';
import type { Course } from '../../types';
import Modal from '../Modal';
import { ICON_NAMES } from '../icons';
import ModalHeader from '../ModalHeader';

interface EditCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: Partial<Course> | null;
    onSave: (course: Partial<Course>) => void;
}

const EditCourseModal: React.FC<EditCourseModalProps> = ({ isOpen, onClose, course, onSave }) => {
    const [formData, setFormData] = useState<Partial<Course>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);

    useEffect(() => {
        if (course) {
            setFormData({
                id: course.id,
                name: course.name || '',
                description: course.description || '',
                icon: course.icon || ICON_NAMES[0],
                image: course.image || '',
                iconUrl: course.iconUrl || '',
            });
            setImagePreview(course.image || null);
            setIconPreview(course.iconUrl || null);
        }
    }, [course]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setImagePreview(result);
                setFormData({ ...formData, image: result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setIconPreview(result);
                setFormData({ ...formData, iconUrl: result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        onSave(formData);
        setIsLoading(false);
    };

    if (!course) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div>
                <ModalHeader 
                    title={course.id ? 'Edit Course' : 'Add New Course'}
                />
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Course Name</label>
                        <input type="text" id="name" name="name" value={formData.name || ''} onChange={handleChange} required className="mt-1 block w-full form-input" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="description" name="description" rows={3} value={formData.description || ''} onChange={handleChange} required className="mt-1 block w-full form-textarea"></textarea>
                    </div>
                    <div>
                        <label htmlFor="icon" className="block text-sm font-medium text-gray-700">Icon</label>
                        <select id="icon" name="icon" value={formData.icon} onChange={handleChange} className="mt-1 block w-full form-select">
                            {ICON_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">This name determines which icon is shown on the homepage.</p>
                    </div>
                    
                    {/* Course Image Upload for Registration Screen */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Course Image (Optional)
                        </label>
                        <div className="space-y-3">
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                    {imagePreview ? (
                                        <div className="relative w-full h-full">
                                            <img 
                                                src={imagePreview} 
                                                alt="Course preview" 
                                                className="w-full h-full object-contain rounded-lg"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                                                <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 transition-opacity">Click to change</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                            </svg>
                                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> course image</p>
                                            <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 5MB)</p>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">This image will be displayed on the registration screen course tiles</p>
                        </div>
                    </div>

                    {/* Custom Icon Upload for Listing Pages */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom Icon (Optional)
                        </label>
                        <div className="space-y-3">
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                    {iconPreview ? (
                                        <div className="relative w-full h-full p-2">
                                            <img 
                                                src={iconPreview} 
                                                alt="Icon preview" 
                                                className="w-full h-full object-contain rounded-lg"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                                                <span className="text-white text-xs font-medium opacity-0 hover:opacity-100 transition-opacity">Click to change</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-3 pb-3">
                                            <svg className="w-6 h-6 mb-2 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                            </svg>
                                            <p className="text-xs text-gray-500"><span className="font-semibold">Upload icon</span></p>
                                            <p className="text-xs text-gray-500">SVG, PNG, JPG (MAX. 1MB)</p>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*,.svg"
                                        onChange={handleIconUpload}
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">This icon will be used on listing pages and menus</p>
                        </div>
                    </div>
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center mt-6 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default EditCourseModal;
