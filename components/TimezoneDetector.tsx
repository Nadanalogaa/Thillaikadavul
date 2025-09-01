import React, { useState, useEffect, useRef } from 'react';
import { detectUserTimezone, getAllTimezones, COMMON_TIMEZONES, getTimezoneAbbreviation } from '../utils/timezone';

interface TimezoneDetectorProps {
  currentTimezone?: string;
  onTimezoneChange: (timezone: string) => void;
  onConfirm?: () => void;
}

const TimezoneDetector: React.FC<TimezoneDetectorProps> = ({ 
  currentTimezone, 
  onTimezoneChange, 
  onConfirm 
}) => {
  const [detectedTimezone, setDetectedTimezone] = useState<string>('');
  const [showPicker, setShowPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const detection = detectUserTimezone();
    setDetectedTimezone(detection.timezone);
    
    // Show confirmation if no timezone is set yet or if detected timezone is different
    if (!currentTimezone || (currentTimezone !== detection.timezone && detection.confidence === 'high')) {
      setShowConfirmation(true);
      if (!currentTimezone) {
        onTimezoneChange(detection.timezone);
      }
    }
  }, []);

  useEffect(() => {
    if (showPicker && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showPicker]);

  const allTimezones = getAllTimezones();
  const filteredTimezones = searchTerm 
    ? allTimezones.filter(tz => 
        tz.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tz.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allTimezones;

  const handleTimezoneSelect = (timezone: string) => {
    onTimezoneChange(timezone);
    setShowPicker(false);
    setSearchTerm('');
    setShowConfirmation(false);
  };

  const handleConfirmDetected = () => {
    onTimezoneChange(detectedTimezone);
    setShowConfirmation(false);
    onConfirm?.();
  };

  const getCurrentTimezoneInfo = () => {
    const tz = currentTimezone || detectedTimezone;
    const tzInfo = allTimezones.find(t => t.value === tz);
    return tzInfo || { 
      value: tz, 
      label: tz.replace('_', ' '), 
      offset: getTimezoneAbbreviation(tz) 
    };
  };

  const currentTzInfo = getCurrentTimezoneInfo();

  return (
    <div className="relative">
      {/* Timezone Confirmation Banner */}
      {showConfirmation && detectedTimezone && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-700">
                <strong>Detected:</strong> {allTimezones.find(t => t.value === detectedTimezone)?.label || detectedTimezone}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleConfirmDetected}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ✓ Correct
              </button>
              <button
                onClick={() => setShowPicker(true)}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Timezone Display */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Timezone:</span>
          <span className="font-medium text-gray-900">
            {currentTzInfo.label}
          </span>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
            {currentTzInfo.offset}
          </span>
        </div>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Change
        </button>
      </div>

      {/* Timezone Picker */}
      {showPicker && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search timezones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Common Timezones */}
          {!searchTerm && (
            <div className="p-3 border-b bg-gray-50">
              <div className="text-xs font-semibold text-gray-700 mb-2">Common Timezones</div>
              <div className="space-y-1">
                {COMMON_TIMEZONES.slice(0, 5).map(tz => (
                  <button
                    key={tz.value}
                    onClick={() => handleTimezoneSelect(tz.value)}
                    className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>{tz.label}</span>
                    <span className="text-xs text-gray-500">{tz.offset}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All Timezones */}
          <div className="max-h-60 overflow-y-auto">
            {filteredTimezones.length > 0 ? (
              <div className="p-1">
                {filteredTimezones.map(tz => (
                  <button
                    key={tz.value}
                    onClick={() => handleTimezoneSelect(tz.value)}
                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-blue-50 flex items-center justify-between ${
                      currentTimezone === tz.value ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                    }`}
                  >
                    <span>{tz.label}</span>
                    <span className="text-xs text-gray-500">{tz.offset}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                No timezones found matching "{searchTerm}"
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="p-3 border-t bg-gray-50">
            <button
              onClick={() => {
                setShowPicker(false);
                setSearchTerm('');
              }}
              className="w-full px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimezoneDetector;