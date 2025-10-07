import { useState, useEffect } from 'react';
import { Sparkles, MessageCircle, CheckCircle, Globe } from 'lucide-react';

interface AIProcessingLoaderProps {
  isVisible: boolean;
  language: string;
  onComplete?: () => void;
}

const processingSteps = [
  { id: 'init', text: 'Processing request...', duration: 800, icon: Sparkles },
  { id: 'language', text: 'Detecting language preferences...', duration: 600, icon: Globe },
  { id: 'generating', text: 'Generating messages...', duration: 1200, icon: MessageCircle },
  { id: 'finalizing', text: 'Preparing for delivery...', duration: 500, icon: CheckCircle },
  { id: 'complete', text: 'Response received', duration: 300, icon: CheckCircle }
];

const languageNames: Record<string, string> = {
  'en': 'English',
  'hi': 'Hindi',
  'kn': 'Kannada',
  'te': 'Telugu',
  'ta': 'Tamil',
  'ml': 'Malayalam',
  'ur': 'Urdu',
  'bn': 'Bengali',
  'gu': 'Gujarati',
  'mr': 'Marathi',
  'pa': 'Punjabi',
  'or': 'Odia',
  'as': 'Assamese'
};

export default function AIProcessingLoader({ isVisible, language, onComplete }: AIProcessingLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      setCompletedSteps(new Set());
      return;
    }

    let timeoutId: NodeJS.Timeout;
    
    const runStep = (stepIndex: number) => {
      if (stepIndex >= processingSteps.length) {
        onComplete?.();
        return;
      }

      const step = processingSteps[stepIndex];
      setCurrentStep(stepIndex);

      timeoutId = setTimeout(() => {
        setCompletedSteps(prev => new Set([...prev, step.id]));
        
        if (stepIndex === processingSteps.length - 1) {
          // Last step - mark complete and call onComplete after a brief delay
          setTimeout(() => {
            onComplete?.();
          }, 200);
        } else {
          runStep(stepIndex + 1);
        }
      }, step.duration);
    };

    runStep(0);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  const languageDisplayName = languageNames[language] || language;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-3">
            <Sparkles className="h-6 w-6 text-indigo-600 animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">AI Processing</h3>
          <p className="text-sm text-gray-600">
            Generating {languageDisplayName} messages...
          </p>
        </div>

        <div className="space-y-3">
          {processingSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === index;
            const isCompleted = completedSteps.has(step.id);

            // Custom text for language step
            let displayText = step.text;
            if (step.id === 'generating' && language !== 'en') {
              displayText = `Generating ${languageDisplayName} response...`;
            }

            return (
              <div key={step.id} className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                isActive ? 'bg-indigo-50' : isCompleted ? 'bg-green-50' : 'bg-gray-50'
              }`}>
                <div className={`flex-shrink-0 ${
                  isCompleted ? 'text-green-600' : isActive ? 'text-indigo-600' : 'text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isActive ? (
                    <Icon className="h-4 w-4 animate-pulse" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className={`flex-1 text-sm ${
                  isCompleted ? 'text-green-800' : isActive ? 'text-indigo-800' : 'text-gray-500'
                }`}>
                  {displayText}
                  {isActive && (
                    <span className="inline-block ml-1">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                    </span>
                  )}
                </div>
                {isCompleted && (
                  <div className="text-green-600">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 bg-gray-100 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / processingSteps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}