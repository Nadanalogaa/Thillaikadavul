import React, { useState } from 'react';
import { Wand2, Send, Sparkles, X } from 'lucide-react';

interface AIAssistantProps {
  selectedSection?: any;
  onContentGenerated?: (content: any) => void;
  onClose: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  selectedSection,
  onContentGenerated,
  onClose
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const quickPrompts = [
    'Generate engaging content for this section',
    'Create SEO-friendly meta description', 
    'Write compelling call-to-action text',
    'Generate alt text for images',
    'Create section title suggestions'
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      const generatedContent = {
        title: 'AI Generated Title',
        description: `Generated content based on: "${prompt}"`
      };
      onContentGenerated?.(generatedContent);
      setPrompt('');
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {selectedSection && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 text-sm">Current Section</h4>
            <p className="text-sm text-gray-600">{selectedSection.name}</p>
          </div>
        )}

        {/* Custom Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What would you like me to help with?
          </label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to generate..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="absolute bottom-2 right-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-2 rounded-md"
            >
              {isGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Prompts */}
        <div>
          <h4 className="font-medium text-gray-900 text-sm mb-2">Quick Actions</h4>
          <div className="space-y-2">
            {quickPrompts.map((quickPrompt, index) => (
              <button
                key={index}
                onClick={() => setPrompt(quickPrompt)}
                disabled={isGenerating}
                className="w-full text-left text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 p-2 rounded border border-gray-200 hover:border-purple-200 transition-colors disabled:opacity-50"
              >
                {quickPrompt}
              </button>
            ))}
          </div>
        </div>

        {isGenerating && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent" />
              <span className="text-sm text-purple-800">Generating content...</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex items-center justify-center text-xs text-gray-500">
          <Sparkles className="w-3 h-3 mr-1" />
          AI-powered content assistance
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;