import React, { useEffect, useState, useRef } from 'react';
import { usePayrollGuide } from './PayrollGuideProvider';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import './payrollTour.css';

const PayrollTourTooltip: React.FC = () => {
  const { activeTour, currentStep, isRunning, nextStep, prevStep, stopTour } = usePayrollGuide();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const targetElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isRunning || !activeTour) return;

    const step = activeTour.steps[currentStep];
    const target = document.querySelector(step.target) as HTMLElement;

    if (target) {
      setTargetElement(target);
      targetElementRef.current = target;
      const rect = target.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      let newTop = rect.bottom + scrollTop + 10;
      let newLeft = rect.left + scrollLeft;

      if (step.placement === 'right') {
        newTop = rect.top + scrollTop;
        newLeft = rect.right + scrollLeft + 10;
      } else if (step.placement === 'left') {
        newTop = rect.top + scrollTop;
        newLeft = rect.left + scrollLeft - 370; // Tooltip max-width is 350px + padding
        // Ensure it doesn't overlap sidebar (sidebar is 260px wide)
        if (newLeft < 280) {
          newLeft = 280;
        }
      }

      setPosition({
        top: newTop,
        left: newLeft,
      });
      setHighlightPosition({
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height,
      });
    }
  }, [isRunning, activeTour, currentStep]);

  // Update position on scroll
  useEffect(() => {
    if (!isRunning || !activeTour) return;

    const handleScroll = () => {
      const currentTarget = targetElementRef.current;
      if (!currentTarget) return;

      const rect = currentTarget.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const step = activeTour.steps[currentStep];

      let newTop = rect.bottom + scrollTop + 10;
      let newLeft = rect.left + scrollLeft;

      if (step.placement === 'right') {
        newTop = rect.top + scrollTop;
        newLeft = rect.right + scrollLeft + 10;
      } else if (step.placement === 'left') {
        newTop = rect.top + scrollTop;
        newLeft = rect.left + scrollLeft - 370;
        // Ensure it doesn't overlap sidebar (sidebar is 260px wide)
        if (newLeft < 280) {
          newLeft = 280;
        }
      }

      setPosition({
        top: newTop,
        left: newLeft,
      });
      setHighlightPosition({
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height,
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isRunning, activeTour, currentStep]);

  const handleNext = () => {
    nextStep();
  };

  const handlePrev = () => {
    prevStep();
  };

  const handleSkip = () => {
    stopTour();
  };

  if (!isRunning || !activeTour) return null;

  const step = activeTour.steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === activeTour.steps.length - 1;

  return (
    <>
      {/* Spotlight overlay */}
      <div className="payroll-tour-overlay" />
      
      {/* Highlighted element */}
      {targetElement && (
        <div
          className="payroll-tour-highlight"
          style={{
            top: highlightPosition.top,
            left: highlightPosition.left,
            width: highlightPosition.width,
            height: highlightPosition.height,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="payroll-tour-tooltip"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        <button
          className="payroll-tour-close"
          onClick={handleSkip}
          aria-label="Close tour"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="payroll-tour-content">
          <h3 className="payroll-tour-title">{step.title}</h3>
          <p className="payroll-tour-description">{step.content}</p>
        </div>

        <div className="payroll-tour-footer">
          <div className="payroll-tour-progress">
            {currentStep + 1} / {activeTour.steps.length}
          </div>

          <div className="payroll-tour-buttons">
            {!isFirstStep && (
              <button
                className="payroll-tour-button payroll-tour-button-secondary"
                onClick={handlePrev}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            
            <button
              className="payroll-tour-button payroll-tour-button-primary"
              onClick={handleNext}
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>

            <button
              className="payroll-tour-button payroll-tour-button-skip"
              onClick={handleSkip}
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PayrollTourTooltip;
