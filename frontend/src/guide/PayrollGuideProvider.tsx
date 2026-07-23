import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenTour, TourStep, getTourByScreenId, getAllTours } from './payrollTourConfig';

interface TourProgress {
  completed: boolean;
  lastStep: number;
  startedAt?: number;
  completedAt?: number;
}

interface TourState {
  tourProgress: Record<string, TourProgress>;
  tourDismissed: boolean;
  autoTriggerShown: boolean;
}

interface TourContextType {
  activeTour: ScreenTour | null;
  currentStep: number;
  isRunning: boolean;
  startTour: (screenId: string) => void;
  stopTour: () => void;
  resetTour: (screenId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  isTourCompleted: (screenId: string) => boolean;
  getAvailableTours: () => ScreenTour[];
  getTourProgress: (screenId: string) => TourProgress | undefined;
  dismissTour: () => void;
  setAutoTriggerShown: () => void;
  startFullTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const STORAGE_KEY = 'tactic_payroll_tour_state';

const defaultState: TourState = {
  tourProgress: {},
  tourDismissed: false,
  autoTriggerShown: false,
};

const loadState = (): TourState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultState;
  } catch {
    return defaultState;
  }
};

const saveState = (state: TourState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save tour state:', error);
  }
};

export const PayrollGuideProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TourState>(defaultState);
  const [activeTour, setActiveTour] = useState<ScreenTour | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const navigate = useNavigate();

  // Load state from localStorage on mount
  useEffect(() => {
    setState(loadState());
  }, []);

  const startTour = (screenId: string) => {
    const tour = getTourByScreenId(screenId);
    if (!tour) return;

    const progress = state.tourProgress[screenId];
    const startFrom = progress && !progress.completed ? progress.lastStep : 0;

    setActiveTour(tour);
    setCurrentStep(startFrom);
    setIsRunning(true);

    // Navigate to the tour's route if not already there
    if (tour.route && window.location.pathname !== tour.route) {
      navigate(tour.route);
    }

    // Update progress
    setState(prev => ({
      ...prev,
      tourProgress: {
        ...prev.tourProgress,
        [screenId]: {
          ...prev.tourProgress[screenId],
          lastStep: startFrom,
          startedAt: prev.tourProgress[screenId]?.startedAt || Date.now(),
          completed: false,
        },
      },
    }));
  };

  const startFullTour = () => {
    // Start with the dashboard tour
    startTour('dashboard');
  };

  const stopTour = () => {
    setIsRunning(false);
    setActiveTour(null);
    setCurrentStep(0);
  };

  const resetTour = (screenId: string) => {
    setState(prev => ({
      ...prev,
      tourProgress: {
        ...prev.tourProgress,
        [screenId]: {
          completed: false,
          lastStep: 0,
        },
      },
    }));
  };

  const nextStep = () => {
    if (!activeTour) return;

    const nextStepIndex = currentStep + 1;
    const step = activeTour.steps[nextStepIndex];

    // Handle cross-page navigation
    if (step?.route && window.location.pathname !== step.route) {
      navigate(step.route);
      // Give navigation time to complete before moving to next step
      setTimeout(() => {
        setCurrentStep(nextStepIndex);
      }, 300);
    } else if (nextStepIndex >= activeTour.steps.length) {
      // Tour completed
      setState(prev => ({
        ...prev,
        tourProgress: {
          ...prev.tourProgress,
          [activeTour.id]: {
            ...prev.tourProgress[activeTour.id],
            completed: true,
            lastStep: activeTour.steps.length - 1,
            completedAt: Date.now(),
          },
        },
      }));
      stopTour();
    } else {
      setCurrentStep(nextStepIndex);
      setState(prev => ({
        ...prev,
        tourProgress: {
          ...prev.tourProgress,
          [activeTour.id]: {
            ...prev.tourProgress[activeTour.id],
            lastStep: nextStepIndex,
          },
        },
      }));
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      const step = activeTour?.steps[prevStepIndex];

      // Handle cross-page navigation when going back
      if (step?.route && window.location.pathname !== step.route) {
        navigate(step.route);
        setTimeout(() => {
          setCurrentStep(prevStepIndex);
        }, 300);
      } else {
        setCurrentStep(prevStepIndex);
      }

      setState(prev => ({
        ...prev,
        tourProgress: {
          ...prev.tourProgress,
          [activeTour?.id || '']: {
            ...prev.tourProgress[activeTour?.id || ''],
            lastStep: prevStepIndex,
          },
        },
      }));
    }
  };

  const isTourCompleted = (screenId: string): boolean => {
    return state.tourProgress[screenId]?.completed || false;
  };

  const getAvailableTours = (): ScreenTour[] => {
    return getAllTours();
  };

  const getTourProgress = (screenId: string): TourProgress | undefined => {
    return state.tourProgress[screenId];
  };

  const dismissTour = () => {
    setState(prev => ({
      ...prev,
      tourDismissed: true,
    }));
    stopTour();
  };

  const setAutoTriggerShown = () => {
    setState(prev => ({
      ...prev,
      autoTriggerShown: true,
    }));
  };

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  const value: TourContextType = {
    activeTour,
    currentStep,
    isRunning,
    startTour,
    stopTour,
    resetTour,
    nextStep,
    prevStep,
    isTourCompleted,
    getAvailableTours,
    getTourProgress,
    dismissTour,
    setAutoTriggerShown,
    startFullTour,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export const usePayrollGuide = (): TourContextType => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('usePayrollGuide must be used within a PayrollGuideProvider');
  }
  return context;
};
