import { useState } from 'react'
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Settings, 
  Lightbulb, 
  FlaskConical, 
  Users, 
  FileCheck,
  Sparkles,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Zap
} from 'lucide-react'

interface OnboardingProps {
  onComplete: () => void
  userName?: string
}

interface StepContent {
  title: string
  subtitle: string
  icon: React.ReactNode
  content: React.ReactNode
}

export function Onboarding({ onComplete, userName }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps: StepContent[] = [
    {
      title: "Welcome to NIH Grant Validator",
      subtitle: "Your AI-powered grant writing assistant",
      icon: <Sparkles className="w-12 h-12 text-primary-500" />,
      content: (
        <div className="space-y-6">
          <p className="text-lg text-neutral-600">
            {userName ? `Hi ${userName}! ` : ''}Welcome to your NIH SBIR/STTR grant writing companion. 
            This system helps you create compliant, competitive grant applications using AI assistance at every step.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard
              icon={<Target className="w-6 h-6 text-primary-500" />}
              title="Guided Workflow"
              description="Step-by-step process from concept to submission-ready documents"
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6 text-purple-500" />}
              title="AI Generation"
              description="Generate compliant text for every section with one click"
            />
            <FeatureCard
              icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
              title="Compliance Checking"
              description="Real-time validation against NIH requirements"
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6 text-green-500" />}
              title="Auto-Save"
              description="Your work is automatically saved as you go"
            />
          </div>
        </div>
      )
    },
    {
      title: "The 5-Step Workflow",
      subtitle: "A structured path to your complete application",
      icon: <BookOpen className="w-12 h-12 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-neutral-600 mb-6">
            Your grant application is organized into 5 logical steps. Complete them in order, 
            or jump between steps as needed.
          </p>
          
          <div className="space-y-3">
            <WorkflowStep
              number={1}
              icon={<Settings className="w-5 h-5" />}
              title="Application Setup"
              description="Select your grant type (Phase I, II, Fast Track), program (SBIR/STTR), and target NIH institute. Upload an FOA for specific requirements."
              color="blue"
            />
            <WorkflowStep
              number={2}
              icon={<Lightbulb className="w-5 h-5" />}
              title="Core Concept"
              description="Define your project title, hypothesis, and Specific Aims. This is the foundation of your entire application."
              color="amber"
            />
            <WorkflowStep
              number={3}
              icon={<FlaskConical className="w-5 h-5" />}
              title="Research Plan"
              description="Detail your experimental approach, methodology, statistical plan, and expected outcomes."
              color="green"
            />
            <WorkflowStep
              number={4}
              icon={<Users className="w-5 h-5" />}
              title="Team & Budget"
              description="Define your team qualifications, key personnel, and budget breakdown."
              color="purple"
            />
            <WorkflowStep
              number={5}
              icon={<FileCheck className="w-5 h-5" />}
              title="Review & Export"
              description="Validate your application, run compliance audits, and export your compiled grant documents."
              color="red"
            />
          </div>
        </div>
      )
    },
    {
      title: "AI-Powered Features",
      subtitle: "Let AI help you write compliant content",
      icon: <Zap className="w-12 h-12 text-amber-500" />,
      content: (
        <div className="space-y-6">
          <p className="text-neutral-600">
            Throughout the application, look for the <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm font-medium"><Sparkles className="w-4 h-4" /> Generate with AI</span> buttons. 
            These create NIH-compliant text based on your inputs.
          </p>

          <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200">
            <h4 className="font-semibold text-neutral-900 mb-3">What AI Can Generate:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Specific Aims Page</strong> — The most important page of your grant</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Experimental Plan</strong> — Detailed methodology with statistical considerations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Research Strategy</strong> — Significance, Innovation, and Approach sections</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Project Summary</strong> — 30-line abstract for your application</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Compiled Grant</strong> — Full application document ready for submission</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Important Note</p>
                <p className="text-sm text-amber-700 mt-1">
                  AI-generated content is a starting point. Always review and customize the output 
                  to match your specific research and institutional requirements.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Specific Aims: Your Foundation",
      subtitle: "The most critical part of your application",
      icon: <Target className="w-12 h-12 text-red-500" />,
      content: (
        <div className="space-y-6">
          <p className="text-neutral-600">
            Your <strong>Specific Aims</strong> are the backbone of your grant. Everything else flows from them. 
            This system lets you define <strong>3 or more aims</strong> with milestones and timelines.
          </p>

          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h4 className="font-semibold text-neutral-900 mb-4">Anatomy of a Strong Aim:</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Clear Statement</p>
                  <p className="text-sm text-neutral-600">What you will accomplish (action verb + specific outcome)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Measurable Milestones</p>
                  <p className="text-sm text-neutral-600">Quantitative checkpoints (e.g., "achieve &gt;50% tumor reduction")</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Timeline</p>
                  <p className="text-sm text-neutral-600">When it will be completed (e.g., "Months 1-6")</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-600 font-bold text-sm">4</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Go/No-Go Criteria</p>
                  <p className="text-sm text-neutral-600">Decision points for Phase I (required by NIH)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Pro Tip:</strong> Start with 3 aims for Phase I. You can add more if needed, 
              but be cautious — reviewers may see too many aims as overambitious for the budget/timeline.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Tips for Success",
      subtitle: "Best practices for a competitive application",
      icon: <CheckCircle className="w-12 h-12 text-green-500" />,
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <TipCard
              number="1"
              title="Complete Step 1 First"
              description="Your grant type and institute determine budget caps, required sections, and compliance rules."
            />
            <TipCard
              number="2"
              title="Be Specific in Aims"
              description="Vague aims = vague reviews. Include target populations, endpoints, and success metrics."
            />
            <TipCard
              number="3"
              title="Use AI, Then Customize"
              description="AI-generated content is compliant but generic. Add your unique data, citations, and expertise."
            />
            <TipCard
              number="4"
              title="Include Preliminary Data"
              description="Even for Phase I, supporting evidence dramatically increases competitiveness."
            />
            <TipCard
              number="5"
              title="Run Compliance Audit"
              description="Before export, use the Compliance Audit in Step 5 to catch issues reviewers will find."
            />
            <TipCard
              number="6"
              title="Phase II = Commercialization"
              description="Phase II/Fast Track requires a 12-page commercialization plan. Start preparing early."
            />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h4 className="font-semibold text-green-800 text-lg">You're Ready!</h4>
            <p className="text-green-700 mt-2">
              Click "Get Started" to begin your first grant application.
            </p>
          </div>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            {steps[currentStep].icon}
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{steps[currentStep].title}</h2>
              <p className="text-sm text-neutral-500">{steps[currentStep].subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            title="Skip tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {steps[currentStep].content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-2xl">
          {/* Progress Dots */}
          <div className="flex items-center gap-2">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  idx === currentStep 
                    ? 'bg-primary-500' 
                    : idx < currentStep 
                      ? 'bg-primary-300' 
                      : 'bg-neutral-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-semibold text-neutral-900">{title}</h4>
        <p className="text-sm text-neutral-600 mt-1">{description}</p>
      </div>
    </div>
  )
}

function WorkflowStep({ 
  number, 
  icon, 
  title, 
  description, 
  color 
}: { 
  number: number; 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color: string 
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    amber: 'bg-amber-100 text-amber-600 border-amber-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    red: 'bg-red-100 text-red-600 border-red-200',
  }

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]} border`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-400">STEP {number}</span>
          <h4 className="font-semibold text-neutral-900">{title}</h4>
        </div>
        <p className="text-sm text-neutral-600 mt-1">{description}</p>
      </div>
    </div>
  )
}

function TipCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="p-4 bg-white rounded-xl border border-neutral-200">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-primary-600 font-bold text-sm">{number}</span>
        </div>
        <div>
          <h4 className="font-semibold text-neutral-900">{title}</h4>
          <p className="text-sm text-neutral-600 mt-1">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default Onboarding
