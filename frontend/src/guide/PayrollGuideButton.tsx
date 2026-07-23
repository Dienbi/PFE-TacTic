import React, { useState, useRef, useEffect } from 'react';
import { usePayrollGuide } from './PayrollGuideProvider';
import { Play, ChevronDown, RotateCcw, CheckCircle, Circle } from 'lucide-react';

const PayrollGuideButton: React.FC = () => {
  const { getAvailableTours, startTour, resetTour, isTourCompleted, getTourProgress, startFullTour } = usePayrollGuide();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tours = getAvailableTours();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartTour = (screenId: string) => {
    startTour(screenId);
    setIsOpen(false);
  };

  const handleResetTour = (screenId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    resetTour(screenId);
  };

  const completedCount = tours.filter(t => isTourCompleted(t.id)).length;
  const totalCount = tours.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Play className="w-4 h-4" />
        <span>Guide me</span>
        {completedCount > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
            {completedCount}/{totalCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Payroll Guide Tours</h3>
            <p className="text-xs text-gray-600 mt-1">
              {completedCount} of {totalCount} tours completed
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <div className="p-3 hover:bg-gray-50 border-b border-gray-100">
              <button
                onClick={() => {
                  startFullTour();
                  setIsOpen(false);
                }}
                className="text-left w-full group"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    Start Full Tour
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 ml-6">
                  Take a complete tour of all payroll modules
                </p>
              </button>
            </div>
            {tours.map((tour) => {
              const completed = isTourCompleted(tour.id);
              const progress = getTourProgress(tour.id);
              
              return (
                <div
                  key={tour.id}
                  className="p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <button
                        onClick={() => handleStartTour(tour.id)}
                        className="text-left w-full group"
                      >
                        <div className="flex items-center gap-2">
                          {completed ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                            {tour.screenName}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 ml-6">
                          {tour.description}
                        </p>
                      </button>
                    </div>
                    {completed && (
                      <button
                        onClick={(e) => handleResetTour(tour.id, e)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Reset tour"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {progress && !completed && (
                    <div className="mt-2 ml-6">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Progress:</span>
                        <span className="font-medium">
                          {progress.lastStep + 1} / {tour.steps.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{
                            width: `${((progress.lastStep + 1) / tour.steps.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollGuideButton;
