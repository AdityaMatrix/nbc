import { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  ChevronRight, ChevronLeft, X, Sparkles, 
  LayoutDashboard, FileText, Package, Users, 
  BarChart3, Settings, Bell, Plus, CheckCircle
} from "lucide-react";

// Tutorial steps configuration
const tutorialSteps = [
  {
    id: "welcome",
    title: "Welcome to Capex Portal! 🎉",
    description: "Let's take a quick tour to help you get started. This interactive guide will show you the key features of the application.",
    target: null, // No target - centered modal
    position: "center",
    icon: Sparkles,
  },
  {
    id: "sidebar",
    title: "Navigation Sidebar",
    description: "Use the sidebar to navigate between different sections. You can collapse it using the menu button (⋮) to get more screen space.",
    target: "[data-testid='dashboard-layout'] aside",
    position: "right",
    icon: LayoutDashboard,
  },
  {
    id: "dashboard",
    title: "Dashboard Overview",
    description: "Your dashboard shows key metrics, pending tasks, and recent activities. Click on any card to see detailed information.",
    target: "[data-testid='nav-dashboard']",
    position: "right",
    icon: LayoutDashboard,
  },
  {
    id: "all-requests",
    title: "All Requests",
    description: "View all Capex requests organized by Plant and Department. Use card view for visual navigation or switch to table view for detailed lists.",
    target: "[data-testid='nav-all-requests']",
    position: "right",
    icon: FileText,
  },
  {
    id: "create-request",
    title: "Create New Request",
    description: "Click here to create a new Capex request. Fill in the requirement details, budget, and submit for approval.",
    target: "[data-testid='nav-new-request']",
    position: "right",
    icon: Plus,
  },
  {
    id: "samples",
    title: "Sample Management",
    description: "Track sample requests for your Capex items. Create sample requests, update pickup/dispatch dates, and monitor delivery status.",
    target: "[data-testid='nav-samples']",
    position: "right",
    icon: Package,
  },
  {
    id: "users",
    title: "User Management",
    description: "Manage users, assign roles, and update user details. Only Capex Heads and Buyers can access this section.",
    target: "[data-testid='nav-users']",
    position: "right",
    icon: Users,
  },
  {
    id: "analytics",
    title: "Analytics & Reports",
    description: "View detailed analytics, charts, and export reports. Track spending by plant, department, and time period.",
    target: "[data-testid='nav-analytics']",
    position: "right",
    icon: BarChart3,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Stay updated with real-time notifications. Click on any notification to navigate directly to the related request.",
    target: "[data-testid='notifications-btn']",
    position: "bottom",
    icon: Bell,
  },
  {
    id: "profile",
    title: "Your Profile & Settings",
    description: "Access your profile details, change password, customize themes, and restart this tutorial anytime from Settings.",
    target: "[data-testid='user-menu-btn']",
    position: "bottom-left",
    icon: Settings,
  },
  {
    id: "complete",
    title: "You're All Set! ✅",
    description: "You now know the basics of Capex Portal. Start by exploring the dashboard or creating your first request. You can restart this tutorial anytime from Settings.",
    target: null,
    position: "center",
    icon: CheckCircle,
  },
];

export default function Tutorial({ onComplete, isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  // Find and highlight target element
  const updateTargetPosition = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      
      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      updateTargetPosition();
      
      // Update position on resize
      window.addEventListener('resize', updateTargetPosition);
      return () => window.removeEventListener('resize', updateTargetPosition);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, currentStep, updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('tutorialCompleted', 'true');
    setCurrentStep(0);
    onComplete?.();
    onClose?.();
  };

  const handleSkip = () => {
    localStorage.setItem('tutorialCompleted', 'true');
    setCurrentStep(0);
    onClose?.();
  };

  if (!isVisible) return null;

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!targetRect || step.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 360;
    
    switch (step.position) {
      case 'right':
        return {
          position: 'fixed',
          top: Math.max(padding, targetRect.top),
          left: targetRect.left + targetRect.width + padding,
        };
      case 'bottom':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height + padding,
          left: Math.max(padding, targetRect.left - tooltipWidth / 2 + targetRect.width / 2),
        };
      case 'bottom-left':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height + padding,
          right: padding,
        };
      case 'left':
        return {
          position: 'fixed',
          top: targetRect.top,
          right: window.innerWidth - targetRect.left + padding,
        };
      default:
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  const StepIcon = step.icon;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[9998] transition-opacity duration-300"
        style={{ 
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(2px)',
        }}
        onClick={handleSkip}
      />

      {/* Spotlight on target */}
      {targetRect && (
        <div
          className="fixed z-[9999] rounded-lg transition-all duration-300 pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px 4px rgba(99, 102, 241, 0.5)',
            border: '2px solid rgba(99, 102, 241, 0.8)',
          }}
        />
      )}

      {/* Tooltip Card */}
      <Card
        className="fixed z-[10000] w-[360px] shadow-2xl border-2 border-indigo-200 animate-in fade-in zoom-in-95 duration-300"
        style={getTooltipStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-0">
          {/* Progress bar */}
          <div className="h-1 bg-slate-100 rounded-t-lg overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="p-4 pb-2 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                <StepIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <Badge className="mb-1 text-[9px] bg-indigo-100 text-indigo-700">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </Badge>
                <h3 className="font-bold text-slate-900 text-sm">{step.title}</h3>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-600"
              onClick={handleSkip}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {step.description}
            </p>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500"
                onClick={handleSkip}
              >
                Skip Tutorial
              </Button>
              
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handlePrev}
                  >
                    <ChevronLeft className="w-3 h-3 mr-1" />
                    Back
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-8 text-xs bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
                  onClick={handleNext}
                >
                  {currentStep === tutorialSteps.length - 1 ? (
                    <>
                      Get Started
                      <CheckCircle className="w-3 h-3 ml-1" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Step indicators */}
          <div className="px-4 pb-3 flex justify-center gap-1">
            {tutorialSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'bg-indigo-500 w-4' 
                    : index < currentStep 
                      ? 'bg-indigo-300' 
                      : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
