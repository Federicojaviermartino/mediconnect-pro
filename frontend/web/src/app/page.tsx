import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Activity, Users, Video, Brain } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            MediConnect Pro
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Advanced Telemedicine Platform for Healthcare Professionals
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
          <FeatureCard
            icon={<Users className="w-12 h-12" />}
            title="Patient Management"
            description="Comprehensive patient records, medical history, and appointment scheduling"
          />
          <FeatureCard
            icon={<Activity className="w-12 h-12" />}
            title="Real-time Vitals"
            description="Monitor patient vital signs in real-time with IoT device integration"
          />
          <FeatureCard
            icon={<Video className="w-12 h-12" />}
            title="Video Consultations"
            description="High-quality video calls with screen sharing and chat"
          />
          <FeatureCard
            icon={<Brain className="w-12 h-12" />}
            title="AI Risk Prediction"
            description="Machine learning-powered health risk assessment and analytics"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
          <StatCard number="10K+" label="Patients" />
          <StatCard number="500+" label="Doctors" />
          <StatCard number="50K+" label="Consultations" />
          <StatCard number="99.9%" label="Uptime" />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; 2025 MediConnect Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md text-center">
      <div className="text-3xl font-bold text-primary mb-2">{number}</div>
      <div className="text-gray-600">{label}</div>
    </div>
  )
}
