import React, { useEffect, useState } from 'react';
import { usePayrollGuide } from './PayrollGuideProvider';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import './payrollTour.css';

const PayrollTourTooltip: React.FC = () => {
  const { activeTour, currentStep, isRunning, nextStep, prevStep, stopTour } = usePayrollGuide();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isRunning || !activeTour) return;

    const step = activeTour.steps[currentStep];
    const target = document.querySelector(step.target) as HTMLElement;

    if (target) {
      setTargetElement(target);
      const rect = target.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 10,
        left: rect.left,
      });
    }
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
            top: targetElement.offsetTop,
            left: targetElement.offsetLeft,
            width: targetElement.offsetWidth,
            height: targetElement.offsetHeight,
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
