import React, { useState, useEffect } from 'react';
import AdminNav from '../../components/admin/AdminNav';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MediaItem {
    type: 'image' | 'video' | 'youtube';
    url: string;
    altText?: string;
    caption?: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
    youtubeId?: string;
}

interface ContentBlock {
    id: string;
    sectionId: string;
    sectionType: string;
    title?: string;
    subtitle?: string;
    description?: string;
    content?: any;
    media?: MediaItem[];
    links?: Array<{
        label: string;
        url: string;
        type: 'internal' | 'external' | 'phone' | 'email';
        target?: string;
    }>;
    settings: {
        visible: boolean;
        order: number;
        className?: string;
        customStyles?: string;
    };
    seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
        ogImage?: string;
    };
    status: 'draft' | 'published' | 'archived';
    version: number;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: {
        name: string;
        email: string;
    };
    updatedBy?: {
        name: string;
        email: string;
    };
}

const SortableContentBlock: React.FC<{
    block: ContentBlock;
    onEdit: (block: ContentBlock) => void;
    onDelete: (id: string) => void;
    onPublishToggle: (id: string, status: string) => void;
    onVisibilityToggle: (block: ContentBlock) => void;
    getStatusBadge: (status: string) => string;
}> = ({ block, onEdit, onDelete, onPublishToggle, onVisibilityToggle, getStatusBadge }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white border rounded-lg p-4 mb-4 transition-shadow ${
                isDragging ? 'shadow-lg' : 'shadow-sm'
            } ${!block.settings.visible ? 'opacity-60' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-move p-1 text-gray-400 hover:text-gray-600"
                    >
                        ⋮⋮
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">
                                {block.title || block.sectionId}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(block.status)}`}>
                                {block.status}
                            </span>
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {block.sectionType}
                            </span>
                            {!block.settings.visible && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                    Hidden
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            {block.description || 'No description provided'}
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                            Last updated {new Date(block.updatedAt).toLocaleDateString()}
                            {block.updatedBy && ` by ${block.updatedBy.name}`}
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => onVisibilityToggle(block)}
                        className={`px-3 py-1 text-xs rounded ${
                            block.settings.visible
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                    >
                        {block.settings.visible ? 'Visible' : 'Hidden'}
                    </button>
                    <button
                        onClick={() => onPublishToggle(block.id, block.status)}
                        className={`px-3 py-1 text-xs rounded ${
                            block.status === 'published'
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                    >
                        {block.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                        onClick={() => onEdit(block)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => onDelete(block.id)}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {/* Media preview */}
            {block.media && block.media.length > 0 && (
                <div className="mt-3 flex space-x-2 overflow-x-auto">
                    {block.media.slice(0, 3).map((media, idx) => (
                        <div key={idx} className="flex-shrink-0">
                            {media.type === 'image' ? (
                                <img
                                    src={media.url}
                                    alt={media.altText}
                                    className="w-16 h-16 object-cover rounded"
                                />
                            ) : media.type === 'youtube' ? (
                                <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
                                    <span className="text-red-600 text-xs">YT</span>
                                </div>
                            ) : (
                                <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center">
                                    <span className="text-blue-600 text-xs">VID</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {block.media.length > 3 && (
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-600">
                            +{block.media.length - 3}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const HomepageCMSPage: React.FC = () => {
    const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTab, setSelectedTab] = useState<'all' | 'published' | 'draft'>('all');
    const [uploadingMedia, setUploadingMedia] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const sectionTypes = [
        'header', 'cta', 'hero', 'about', 'statistics', 'programs-marquee',
        'programs', 'services', 'approach', 'gallery', 'awards',
        'testimonials', 'partners', 'blog', 'final-cta', 'footer'
    ];

    useEffect(() => {
        fetchContentBlocks();
    }, [selectedTab]);

    const fetchContentBlocks = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/cms/content?status=${selectedTab === 'all' ? '' : selectedTab}`);
            const data = await response.json();
            setContentBlocks(data);
        } catch (error) {
            console.error('Error fetching content blocks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = contentBlocks.findIndex(block => block.id === active.id);
            const newIndex = contentBlocks.findIndex(block => block.id === over.id);

            const reorderedItems = arrayMove(contentBlocks, oldIndex, newIndex).map((item, index) => ({
                ...item,
                settings: { ...item.settings, order: index }
            }));

            // Update local state immediately for better UX
            setContentBlocks(reorderedItems);

            // Update on server
            try {
                const updates = reorderedItems.map((item, index) => ({
                    id: item.id,
                    order: index
                }));

                await fetch('/api/cms/content/reorder', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates })
                });
            } catch (error) {
                console.error('Error reordering content blocks:', error);
                // Revert on error
                fetchContentBlocks();
            }
        }
    };

    const handlePublishToggle = async (blockId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'published' ? 'draft' : 'published';
            const response = await fetch(`/api/cms/content/${blockId}/publish`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                fetchContentBlocks();
            }
        } catch (error) {
            console.error('Error toggling publish status:', error);
        }
    };

    const handleVisibilityToggle = async (block: ContentBlock) => {
        try {
            const updatedBlock = {
                ...block,
                settings: {
                    ...block.settings,
                    visible: !block.settings.visible
                }
            };

            const response = await fetch(`/api/cms/content/${block.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedBlock)
            });

            if (response.ok) {
                fetchContentBlocks();
            }
        } catch (error) {
            console.error('Error toggling visibility:', error);
        }
    };

    const handleDeleteBlock = async (blockId: string) => {
        if (!confirm('Are you sure you want to delete this content block?')) return;

        try {
            const response = await fetch(`/api/cms/content/${blockId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchContentBlocks();
            }
        } catch (error) {
            console.error('Error deleting content block:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            published: 'bg-green-100 text-green-800',
            draft: 'bg-yellow-100 text-yellow-800',
            archived: 'bg-gray-100 text-gray-800'
        };
        return badges[status as keyof typeof badges] || badges.draft;
    };

    const filteredBlocks = contentBlocks.filter(block => {
        if (selectedTab === 'all') return true;
        return block.status === selectedTab;
    });

    if (loading) {
        return (
            <div className="p-6">
                <AdminPageHeader title="Homepage CMS" />
                <AdminNav />
                <div className="flex justify-center items-center h-64">
                    <div className="text-brand-primary font-semibold">Loading content blocks...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <AdminPageHeader title="Homepage CMS" />
            <AdminNav />

            <div className="bg-white rounded-lg shadow-sm p-6">
                {/* Header with tabs and actions */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex space-x-1">
                        {(['all', 'published', 'draft'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setSelectedTab(tab)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    selectedTab === tab
                                        ? 'bg-brand-primary text-white'
                                        : 'text-gray-600 hover:bg-brand-light/50'
                                }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                {tab !== 'all' && (
                                    <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                                        {contentBlocks.filter(b => b.status === tab).length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-primary/90 transition-colors"
                        >
                            + Add Content Block
                        </button>
                        <button
                            onClick={() => window.open('/api/homepage', '_blank')}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            Preview Homepage Data
                        </button>
                    </div>
                </div>

                {/* Content blocks list */}
                {filteredBlocks.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-medium text-gray-700 mb-2">
                            No content blocks found
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Create your first content block to start managing your homepage.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-brand-primary text-white px-6 py-3 rounded-md hover:bg-brand-primary/90"
                        >
                            Create Content Block
                        </button>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={filteredBlocks.map(block => block.id)} 
                            strategy={verticalListSortingStrategy}
                        >
                            {filteredBlocks.map((block) => (
                                <SortableContentBlock
                                    key={block.id}
                                    block={block}
                                    onEdit={setEditingBlock}
                                    onDelete={handleDeleteBlock}
                                    onPublishToggle={handlePublishToggle}
                                    onVisibilityToggle={handleVisibilityToggle}
                                    getStatusBadge={getStatusBadge}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
};

export default HomepageCMSPage;