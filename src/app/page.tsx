// src/app/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#003876] to-[#002451]">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-24 text-center">
          {/* KMITL Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/kmitl-fight-logo.png" // Replace with actual KMITL logo
              alt="KMITL Logo"
              width={200}
              height={280}
              className="h-30 w-auto"
            />
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            KMITL Exam Invigilator
            <span className="block text-[#F16321] mt-2">Management System</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Streamline your examination process with our comprehensive invigilator management platform
          </p>

          {/* CTA Button */}
          <button
            onClick={() => router.push('/login')}
            className="group inline-flex items-center gap-2 bg-[#F16321] text-white px-8 py-4 
              rounded-lg text-lg font-semibold hover:bg-[#F16321] transition-all 
              transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Let&apos;s Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto pb-20">
          {[
            {
              title: "Easy Scheduling",
              description: "Efficiently manage examination schedules and invigilator assignments"
            },
            {
              title: "Real-time Updates",
              description: "Get instant notifications and updates about examination duties"
            },
            {
              title: "Smart Management",
              description: "Intelligent system for fair distribution of invigilation duties"
            }
          ].map((feature, index) => (
            <div 
              key={index}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-white 
                hover:bg-white/20 transition-all cursor-default"
            >
              <h3 className="text-xl font-semibold mb-3 text-[#F16321]">
                {feature.title}
              </h3>
              <p className="text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 text-center text-gray-400">
          <p>King Mongkut&apos;s Institute of Technology Ladkrabang</p>
          <p className="text-sm mt-2">
            Chalongkrung Road, Ladkrabang, Bangkok 10520, Thailand
          </p>
        </footer>
      </div>
    </div>
  )
}