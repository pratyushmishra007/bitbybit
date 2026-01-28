"use client";

import { useState } from "react";
import Link from "next/link";
import SEO from "../components/SEO";

interface Feature {
  id: number;
  icon: string;
  title: string;
  description: string;
  category: "learning" | "coding" | "community" | "analytics";
  color: string;
  benefits: string[];
}

export default function FeaturesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const features: Feature[] = [
    {
      id: 1,
      icon: "🎯",
      title: "Interactive Code Challenges",
      description: "Practice with real-world coding challenges that test your skills and reinforce learning through hands-on experience.",
      category: "learning",
      color: "from-blue-500 to-blue-600",
      benefits: [
        "Multi-language support (JS, Python, C++, TypeScript)",
        "Real-time code execution via Piston API",
        "Sample and hidden test cases",
        "Instant feedback on solutions"
      ]
    },
    {
      id: 2,
      icon: "🤖",
      title: "AI-Powered Hints",
      description: "Get intelligent, context-aware hints when you're stuck. Our AI understands your code and provides targeted guidance.",
      category: "learning",
      color: "from-purple-500 to-purple-600",
      benefits: [
        "Smart hint system that adapts to your level",
        "Code-specific suggestions",
        "Learning path recommendations",
        "Progressive difficulty scaling"
      ]
    },
    {
      id: 3,
      icon: "⚡",
      title: "Real-Time Code Validation",
      description: "Execute code instantly in a sandboxed environment with support for 10+ programming languages.",
      category: "coding",
      color: "from-green-500 to-green-600",
      benefits: [
        "Sandboxed Docker execution",
        "3-second timeout protection",
        "Memory limits for safety",
        "Detailed error messages"
      ]
    },
    {
      id: 4,
      icon: "💬",
      title: "Discussion Forums",
      description: "Engage with peers, ask questions, share solutions, and learn from the community's collective knowledge.",
      category: "community",
      color: "from-orange-500 to-orange-600",
      benefits: [
        "Lesson-specific discussions",
        "Upvote best answers",
        "Teacher-verified solutions",
        "Real-time notifications"
      ]
    },
    {
      id: 5,
      icon: "📊",
      title: "Progress Tracking",
      description: "Monitor your learning journey with detailed analytics, XP points, and achievement badges.",
      category: "analytics",
      color: "from-indigo-500 to-indigo-600",
      benefits: [
        "XP-based progression system",
        "Level up rewards",
        "Completion certificates",
        "Performance analytics"
      ]
    },
    {
      id: 6,
      icon: "🎓",
      title: "Structured Learning Paths",
      description: "Follow curated learning paths designed by experts to take you from beginner to advanced.",
      category: "learning",
      color: "from-pink-500 to-pink-600",
      benefits: [
        "Beginner to advanced tracks",
        "Prerequisites and dependencies",
        "Estimated completion time",
        "Skill assessments"
      ]
    },
    {
      id: 7,
      icon: "🔒",
      title: "Test Case System",
      description: "Validate your code against multiple test cases including hidden edge cases to ensure robustness.",
      category: "coding",
      color: "from-red-500 to-red-600",
      benefits: [
        "Sample test cases for practice",
        "Hidden test cases for validation",
        "Input/output comparison",
        "Pass/fail detailed feedback"
      ]
    },
    {
      id: 8,
      icon: "👥",
      title: "Code Sharing",
      description: "Share your solutions with the community, get feedback, and learn from others' approaches.",
      category: "community",
      color: "from-teal-500 to-teal-600",
      benefits: [
        "Public/private sharing options",
        "Syntax highlighting",
        "View counter",
        "Comments and reactions"
      ]
    },
    {
      id: 9,
      icon: "🏆",
      title: "Contests & Challenges",
      description: "Participate in coding contests, compete with peers, and climb the leaderboard.",
      category: "community",
      color: "from-yellow-500 to-yellow-600",
      benefits: [
        "Timed coding challenges",
        "Real-time leaderboards",
        "Difficulty-based scoring",
        "Prizes and recognition"
      ]
    },
    {
      id: 10,
      icon: "📝",
      title: "Rich Code Editor",
      description: "Write code in a professional Monaco editor with IntelliSense, syntax highlighting, and shortcuts.",
      category: "coding",
      color: "from-cyan-500 to-cyan-600",
      benefits: [
        "VS Code-like experience",
        "Multi-cursor editing",
        "Keyboard shortcuts",
        "Auto-completion"
      ]
    },
    {
      id: 11,
      icon: "📈",
      title: "Performance Metrics",
      description: "Track code execution time, memory usage, and optimize your solutions for better performance.",
      category: "analytics",
      color: "from-emerald-500 to-emerald-600",
      benefits: [
        "Execution time tracking",
        "Memory usage analysis",
        "Code complexity metrics",
        "Optimization suggestions"
      ]
    },
    {
      id: 12,
      icon: "🎨",
      title: "Customizable Themes",
      description: "Choose from multiple editor themes and customize your learning environment.",
      category: "coding",
      color: "from-violet-500 to-violet-600",
      benefits: [
        "Dark and light modes",
        "Multiple color schemes",
        "Font size adjustments",
        "Accessibility options"
      ]
    }
  ];

  const categories = [
    { id: "all", label: "All Features", icon: "✨" },
    { id: "learning", label: "Learning", icon: "📚" },
    { id: "coding", label: "Coding", icon: "💻" },
    { id: "community", label: "Community", icon: "👥" },
    { id: "analytics", label: "Analytics", icon: "📊" }
  ];

  const filteredFeatures = selectedCategory === "all" 
    ? features 
    : features.filter(f => f.category === selectedCategory);

  return (
    <>
      <SEO 
        title="Features - BitByBit"
        description="Discover powerful features including AI-powered hints, real-time code execution, interactive challenges, and community discussions."
        keywords="coding platform features, interactive learning, AI hints, code execution, programming challenges"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        {/* Hero Section */}
        <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for Modern Learning
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Everything you need to master programming - from AI-powered hints to real-time code execution and community-driven learning.
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 sm:px-6 lg:px-8 mb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <span className="mr-2">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  {/* Feature Header */}
                  <div className={`h-2 bg-gradient-to-r ${feature.color}`} />
                  
                  <div className="p-6">
                    {/* Icon */}
                    <div className="mb-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                        {feature.icon}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Benefits */}
                    <div className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {benefit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-2xl p-12 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Start Learning?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of students mastering programming with our interactive platform.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/courses"
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                Browse Courses
              </Link>
              <Link
                href="/auth/signup"
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
