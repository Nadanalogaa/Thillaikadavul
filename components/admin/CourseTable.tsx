
import React from 'react';
import type { Course } from '../../types';

interface CourseTableProps {
    courses: Course[];
    onEdit: (course: Course) => void;
    onDelete: (courseId: string) => void;
    onAddNew: () => void;
}

const CourseTable: React.FC<CourseTableProps> = ({ courses, onEdit, onDelete, onAddNew }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">Courses ({courses.length})</h2>
                <button onClick={onAddNew} className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors">
                    Add New Course
                </button>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Icon Name</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {courses.length > 0 ? (
                                courses.map((course) => (
                                    <tr key={course.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                                                {course.image ? (
                                                    <img 
                                                        src={course.image} 
                                                        alt={course.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v14a2 2 0 002 2z"></path>
                                                        </svg>
                                                        <span className="text-xs">No Image</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-sm truncate">{course.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.icon}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                            <button onClick={() => onEdit(course)} className="text-brand-primary hover:text-brand-dark">Edit</button>
                                            <button onClick={() => onDelete(course.id)} className="text-red-600 hover:text-red-800">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No courses found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CourseTable;