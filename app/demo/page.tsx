"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function DemoPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [typedCode, setTypedCode] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize dark mode from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Apply dark mode class when isDarkMode changes (after initial mount)
  useEffect(() => {
    if (!mounted) return;
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode, mounted]);

  // Toggle dark mode and save preference
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const demoSteps = [
    {
      title: "Choose Your Course",
      description: "Browse through 50+ interactive courses covering everything from basics to advanced topics",
      icon: "📚",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Interactive Code Editor",
      description: "Write code in our Monaco-powered editor with syntax highlighting and autocomplete",
      icon: "💻",
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Instant Test Results",
      description: "Run your code against test cases and get immediate feedback on your solution",
      icon: "✅",
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "AI-Powered Assistance",
      description: "Get personalized help from our AI tutor that guides you without giving away answers",
      icon: "🤖",
      color: "from-orange-500 to-red-500"
    },
    {
      title: "Real-Time Collaboration",
      description: "Work together with teachers and peers in synchronized coding sessions",
      icon: "👥",
      color: "from-indigo-500 to-purple-500"
    },
    {
      title: "Track Your Progress",
      description: "Earn XP, level up, and maintain streaks while building your coding portfolio",
      icon: "🎯",
      color: "from-yellow-500 to-orange-500"
    },
    {
      title: "Contests & Challenges",
      description: "Compete with peers in coding contests and climb the global leaderboard",
      icon: "🏆",
      color: "from-red-500 to-pink-500"
    },
    {
      title: "Community Discussions",
      description: "Join discussions, share solutions, and learn from the community",
      icon: "💬",
      color: "from-cyan-500 to-blue-500"
    },
    {
      title: "Teacher Tools",
      description: "Manage classes, review student code, and provide instant help when needed",
      icon: "👨‍🏫",
      color: "from-teal-500 to-green-500"
    },
    {
      title: "Achievements & Certificates",
      description: "Unlock badges, earn certificates, and showcase your coding journey",
      icon: "🎓",
      color: "from-violet-500 to-purple-500"
    }
  ];

  const sampleCode = `function findMax(numbers) {
  let max = numbers[0];
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] > max) {
      max = numbers[i];
    }
  }
  return max;
}`;

  const testCases = [
    { input: "[1, 5, 3, 9, 2]", expected: "9", status: "pass" },
    { input: "[-1, -5, -3]", expected: "-1", status: "pass" },
    { input: "[42]", expected: "42", status: "pass" }
  ];

  useEffect(() => {
    if (isPlaying && activeStep === 1) {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex <= sampleCode.length) {
          setTypedCode(sampleCode.slice(0, currentIndex));
          currentIndex += 2;
        } else {
          clearInterval(interval);
          setTimeout(() => setShowOutput(true), 500);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isPlaying, activeStep]);

  // Auto-play through all steps
  useEffect(() => {
    if (!isPlaying) return;
    
    const stepDuration = 5000; // 5 seconds per step
    let progressInterval: NodeJS.Timeout;
    let stepTimeout: NodeJS.Timeout;

    // Reset progress
    setAutoPlayProgress(0);

    // Trigger step-specific animations
    if (activeStep === 3) {
      simulateAIChat();
    }

    // Progress bar animation
    progressInterval = setInterval(() => {
      setAutoPlayProgress(prev => {
        if (prev >= 100) return 100;
        return prev + (100 / (stepDuration / 100));
      });
    }, 100);

    // Move to next step
    stepTimeout = setTimeout(() => {
      if (activeStep < demoSteps.length - 1) {
        setActiveStep(prev => prev + 1);
        setAutoPlayProgress(0);
      } else {
        setIsPlaying(false);
        setIsFullscreen(false);
        setAutoPlayProgress(0);
      }
    }, stepDuration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stepTimeout);
    };
  }, [isPlaying, activeStep]);

  const startInteractiveDemo = () => {
    setIsPlaying(true);
    setIsFullscreen(true);
    setActiveStep(0);
    setTypedCode("");
    setShowOutput(false);
    setAutoPlayProgress(0);
  };

  const stopDemo = () => {
    setIsPlaying(false);
    setIsFullscreen(false);
    setAutoPlayProgress(0);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const simulateAIChat = () => {
    setChatMessages([
      { role: "user", text: "I'm not sure how to find the maximum value in an array" },
    ]);
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, 
        { role: "ai", text: "Great question! Let's think about this step by step. What do you think should be our starting point?" }
      ]);
    }, 1000);
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, 
        { role: "user", text: "Maybe we start with the first element?" }
      ]);
    }, 2500);
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, 
        { role: "ai", text: "Excellent! Now, what should we do with the remaining elements?" }
      ]);
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-black dark:to-gray-900 transition-colors duration-500">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleDarkMode}
        className="fixed top-20 right-6 z-40 p-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        aria-label="Toggle theme"
      >
        {isDarkMode ? (
          <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 bg-blue-100 dark:bg-blue-900/30 backdrop-blur-xl rounded-full text-xs font-semibold text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-800">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
            Interactive Demo
          </div>
          
          <h1 className="text-3xl md:text-5xl font-semibold text-gray-900 dark:text-white mb-3 leading-tight tracking-tight">
            Experience the Future of
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Coding Education
            </span>
          </h1>
          
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-5 max-w-2xl mx-auto font-light">
            See how BitByBit transforms the way you learn programming with AI-powered assistance,
            real-time collaboration, and instant feedback.
          </p>

          <button
            onClick={startInteractiveDemo}
            className="group relative px-8 py-3.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white text-sm font-semibold rounded-full shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 overflow-hidden"
          >
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            
            <span className="relative flex items-center gap-2.5">
              <span className="relative">
                <svg className="w-5 h-5 group-hover:animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
              </span>
              <span className="font-bold tracking-wide">Start Interactive Demo</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </section>

      {/* Fullscreen Demo Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl animate-fadeIn">
          <div className="h-full flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">BB</span>
                </div>
                <div>
                  <div className="text-white font-semibold">Interactive Demo</div>
                  <div className="text-white/60 text-xs">Step {activeStep + 1} of {demoSteps.length}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm"
                >
                  {isPlaying ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Pause
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                      Play
                    </span>
                  )}
                </button>
                <button
                  onClick={stopDemo}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg transition-all text-sm"
                >
                  Exit Demo
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {isPlaying && (
              <div className="h-1 bg-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-100"
                  style={{ width: `${autoPlayProgress}%` }}
                ></div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-7xl mx-auto">
                {/* Step Title */}
                <div className="text-center mb-8 animate-slideUp">
                  <div className="text-6xl mb-4 animate-bounce">{demoSteps[activeStep].icon}</div>
                  <h2 className="text-4xl font-bold text-white mb-3">
                    {demoSteps[activeStep].title}
                  </h2>
                  <p className="text-xl text-white/70 max-w-3xl mx-auto">
                    {demoSteps[activeStep].description}
                  </p>
                </div>

                {/* Step Content (reuse existing content) */}
                <div className="animate-fadeIn">
                  {activeStep === 0 && (
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                      {[
                        { name: "JavaScript Fundamentals", level: "Beginner", lessons: 24, icon: "🟨" },
                        { name: "Python for Data Science", level: "Intermediate", lessons: 18, icon: "🐍" },
                        { name: "React & Next.js", level: "Advanced", lessons: 32, icon: "⚛️" }
                      ].map((course, idx) => (
                        <div 
                          key={idx} 
                          className="group p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 hover:border-white/40 transition-all duration-500 hover:scale-105 cursor-pointer animate-slideUp"
                          style={{ animationDelay: `${idx * 200}ms` }}
                        >
                          <div className="text-5xl mb-4 group-hover:scale-125 transition-transform duration-500">{course.icon}</div>
                          <h3 className="text-xl font-semibold text-white mb-3">{course.name}</h3>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              course.level === 'Beginner' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                              course.level === 'Intermediate' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                              'bg-red-500/30 text-red-300 border border-red-500/50'
                            }`}>
                              {course.level}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-white/70 text-sm">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                            </svg>
                            <span className="font-medium">{course.lessons} Interactive Lessons</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                      <div className="bg-[#1e1e1e] rounded-xl p-4 font-mono text-sm">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                          </div>
                          <span className="text-white/60 text-xs ml-2">solution.js</span>
                        </div>
                        <SyntaxHighlighter
                          language="javascript"
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '1rem',
                            background: 'transparent',
                            fontSize: '13px',
                            minHeight: '250px',
                          }}
                        >
                          {isPlaying ? typedCode : sampleCode}
                        </SyntaxHighlighter>
                      </div>
                      {showOutput && (
                        <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl animate-slideIn">
                          <div className="flex items-center gap-2 text-green-300">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold">Output: 8</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="max-w-3xl mx-auto space-y-4">
                      {[
                        { name: "Test Case 1", input: "[1,2,3,4]", expected: "10", status: "passed" },
                        { name: "Test Case 2", input: "[5,10,15]", expected: "30", status: "passed" },
                        { name: "Test Case 3", input: "[-1,1,0]", expected: "0", status: "passed" }
                      ].map((test, idx) => (
                        <div
                          key={idx}
                          className="p-5 bg-white/10 backdrop-blur-xl rounded-xl border border-green-500/50 animate-slideIn"
                          style={{ animationDelay: `${idx * 200}ms` }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white font-semibold">{test.name}</span>
                            <span className="flex items-center gap-2 text-green-400">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Passed
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-white/60">Input:</span>
                              <code className="ml-2 text-blue-300">{test.input}</code>
                            </div>
                            <div>
                              <span className="text-white/60">Expected:</span>
                              <code className="ml-2 text-green-300">{test.expected}</code>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeStep === 3 && (
                    <div className="max-w-3xl mx-auto">
                      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 h-[500px] flex flex-col">
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 custom-scrollbar">
                          {chatMessages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}
                            >
                              <div className={`max-w-[80%] p-4 rounded-2xl ${
                                msg.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white/20 text-white'
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ask AI for help..."
                            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                          />
                          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 4 && (
                    <div className="max-w-4xl mx-auto">
                      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/20">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-white font-semibold">Live Session</span>
                          </div>
                          <div className="flex -space-x-2">
                            {['👨‍💻', '👩‍💻', '🧑‍💻'].map((emoji, idx) => (
                              <div key={idx} className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-black text-sm">
                                {emoji}
                              </div>
                            ))}
                          </div>
                          <span className="text-white/60 text-sm">3 active collaborators</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-white text-sm font-medium">Sarah (You)</span>
                            </div>
                            <div className="text-white/70 text-sm">Working on function logic...</div>
                          </div>
                          <div className="p-4 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-white text-sm font-medium">Alex</span>
                            </div>
                            <div className="text-white/70 text-sm">Adding test cases...</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 5 && (
                    <div className="max-w-4xl mx-auto space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: 'Total XP', value: '2,450', icon: '⚡', color: 'from-yellow-500 to-orange-500' },
                          { label: 'Streak', value: '7 days', icon: '🔥', color: 'from-red-500 to-pink-500' },
                          { label: 'Rank', value: '#42', icon: '🏆', color: 'from-purple-500 to-blue-500' }
                        ].map((stat, idx) => (
                          <div key={idx} className="p-5 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 animate-slideUp" style={{ animationDelay: `${idx * 150}ms` }}>
                            <div className={`text-3xl mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                              {stat.icon}
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-sm text-white/60">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-4">
                        {[
                          { skill: 'JavaScript', progress: 85, color: 'bg-yellow-500' },
                          { skill: 'Python', progress: 60, color: 'bg-blue-500' },
                          { skill: 'React', progress: 45, color: 'bg-cyan-500' }
                        ].map((item, idx) => (
                          <div key={idx} className="p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 animate-slideIn" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">{item.skill}</span>
                              <span className="text-white/70 text-sm">{item.progress}%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: `${item.progress}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeStep === 6 && (
                    <div className="max-w-4xl mx-auto">
                      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/20">
                          <h3 className="text-xl font-bold text-white">Global Leaderboard</h3>
                          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm border border-green-500/50">
                            Live
                          </span>
                        </div>
                        <div className="space-y-3">
                          {[
                            { name: 'CodeMaster', score: 9850, rank: 1, badge: '👑' },
                            { name: 'DevNinja', score: 8920, rank: 2, badge: '🥈' },
                            { name: 'You', score: 7450, rank: 3, badge: '🥉', highlight: true },
                            { name: 'PyPro', score: 6890, rank: 4, badge: '🎯' },
                            { name: 'ReactQueen', score: 6120, rank: 5, badge: '⚛️' }
                          ].map((player, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-4 rounded-xl transition-all animate-slideIn ${
                                player.highlight
                                  ? 'bg-blue-500/30 border border-blue-500/50'
                                  : 'bg-white/5 hover:bg-white/10'
                              }`}
                              style={{ animationDelay: `${idx * 100}ms` }}
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-2xl font-bold text-white/40 w-8">#{player.rank}</span>
                                <span className="text-2xl">{player.badge}</span>
                                <span className={`font-semibold ${player.highlight ? 'text-blue-300' : 'text-white'}`}>
                                  {player.name}
                                </span>
                              </div>
                              <div className="text-white/80 font-mono">{player.score.toLocaleString()} pts</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 7 && (
                    <div className="max-w-4xl mx-auto space-y-4">
                      {[
                        { title: 'Best practices for React hooks?', author: 'DevLearner', replies: 24, upvotes: 156, tags: ['React', 'JavaScript'] },
                        { title: 'How to optimize Python loops?', author: 'PyNewbie', replies: 18, upvotes: 89, tags: ['Python', 'Performance'] },
                        { title: 'Understanding async/await', author: 'JSExplorer', replies: 31, upvotes: 203, tags: ['JavaScript', 'Async'] }
                      ].map((post, idx) => (
                        <div key={idx} className="p-5 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:border-white/40 transition-all cursor-pointer animate-slideUp" style={{ animationDelay: `${idx * 150}ms` }}>
                          <h4 className="text-lg font-semibold text-white mb-3">{post.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
                            <span>By {post.author}</span>
                            <span>•</span>
                            <span>{post.replies} replies</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-green-400">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              {post.upvotes}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {post.tags.map((tag, tidx) => (
                              <span key={tidx} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs border border-blue-500/30">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeStep === 8 && (
                    <div className="max-w-4xl mx-auto">
                      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/20">
                          <h3 className="text-xl font-bold text-white">Help Requests Queue</h3>
                          <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm border border-orange-500/50">
                            3 Pending
                          </span>
                        </div>
                        <div className="space-y-4">
                          {[
                            { student: 'Alice', lesson: 'React Hooks', time: '2 min ago', status: 'urgent' },
                            { student: 'Bob', lesson: 'Python Lists', time: '5 min ago', status: 'normal' },
                            { student: 'Charlie', lesson: 'CSS Flexbox', time: '8 min ago', status: 'normal' }
                          ].map((request, idx) => (
                            <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/30 transition-all animate-slideIn" style={{ animationDelay: `${idx * 100}ms` }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {request.student[0]}
                                  </div>
                                  <div>
                                    <div className="text-white font-semibold">{request.student}</div>
                                    <div className="text-white/60 text-sm">{request.lesson}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-white/50 text-sm">{request.time}</span>
                                  <button className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg border border-green-500/50 transition-all">
                                    Respond
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 9 && (
                    <div className="max-w-4xl mx-auto">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-xl rounded-2xl border border-yellow-500/30 animate-slideUp">
                          <div className="text-5xl mb-4">🏆</div>
                          <h3 className="text-2xl font-bold text-white mb-2">Course Master</h3>
                          <p className="text-white/70 mb-4">Completed all JavaScript fundamentals</p>
                          <div className="flex gap-2">
                            <button className="flex-1 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all">
                              View Certificate
                            </button>
                            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all">
                              Share
                            </button>
                          </div>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl border border-purple-500/30 animate-slideUp" style={{ animationDelay: '200ms' }}>
                          <div className="text-5xl mb-4">⚡</div>
                          <h3 className="text-2xl font-bold text-white mb-2">Speed Demon</h3>
                          <p className="text-white/70 mb-4">7 day coding streak achieved!</p>
                          <div className="flex gap-2">
                            <button className="flex-1 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all">
                              View Badge
                            </button>
                            <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all">
                              Share
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="border-t border-white/10 px-6 py-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <button
                  onClick={() => {
                    if (activeStep > 0) {
                      setActiveStep(activeStep - 1);
                      setAutoPlayProgress(0);
                    }
                  }}
                  disabled={activeStep === 0}
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                <div className="flex gap-2">
                  {demoSteps.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveStep(idx);
                        setAutoPlayProgress(0);
                      }}
                      className={`h-2 rounded-full transition-all duration-500 ${
                        activeStep === idx 
                          ? 'bg-white w-12' 
                          : activeStep > idx 
                          ? 'bg-green-500 w-2'
                          : 'bg-white/30 w-2'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (activeStep < demoSteps.length - 1) {
                      setActiveStep(activeStep + 1);
                      setAutoPlayProgress(0);
                    }
                  }}
                  disabled={activeStep === demoSteps.length - 1}
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Steps */}
      <section className="container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto">
          {/* Step Navigation */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-4">
            {demoSteps.map((step, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveStep(index);
                  if (index === 3) simulateAIChat();
                }}
                className={`relative p-3 rounded-xl transition-all duration-500 ${
                  activeStep === index
                    ? 'bg-white dark:bg-gray-800 shadow-lg scale-110 border-2 border-blue-600'
                    : 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className={`text-2xl transition-transform ${activeStep === index ? 'scale-110' : ''}`}>
                  {step.icon}
                </div>
                {activeStep === index && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                )}
              </button>
            ))}
          </div>

          {/* Step Content */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <div className="text-2xl">{demoSteps[activeStep].icon}</div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {demoSteps[activeStep].title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-xs font-light">
                    {demoSteps[activeStep].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {activeStep === 0 && (
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { name: "JavaScript Fundamentals", level: "Beginner", lessons: 24, icon: "🟨" },
                    { name: "Python for Data Science", level: "Intermediate", lessons: 18, icon: "🐍" },
                    { name: "React & Next.js", level: "Advanced", lessons: 32, icon: "⚛️" }
                  ].map((course, idx) => (
                    <div key={idx} className="group p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-500 hover:shadow-xl cursor-pointer transform hover:-translate-y-1">
                      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{course.icon}</div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{course.name}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          course.level === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {course.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                        <span className="font-medium">{course.lessons} Lessons</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeStep === 1 && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Code Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Code Editor</h3>
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                      </div>
                    </div>
                    <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-700/50 shadow-xl">
                      <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-700/50">
                        <span className="text-gray-400 text-xs">solution.js</span>
                      </div>
                      <SyntaxHighlighter
                        language="javascript"
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          padding: '1rem',
                          background: '#1e1e1e',
                          fontSize: '13px',
                          minHeight: '220px'
                        }}
                      >
                        {typedCode || sampleCode}
                      </SyntaxHighlighter>
                    </div>
                    <button className="mt-3 w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg">
                      ▶ Run Code
                    </button>
                  </div>

                  {/* Test Cases */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Test Cases</h3>
                    {showOutput ? (
                      <div className="space-y-2.5">
                        {testCases.map((test, idx) => (
                          <div key={idx} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-slideIn" style={{ animationDelay: `${idx * 150}ms` }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-semibold text-green-700 dark:text-green-400 text-sm">Test Case {idx + 1}</span>
                              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Passed
                              </span>
                            </div>
                            <div className="text-xs text-gray-700 dark:text-gray-300">
                              <div className="flex gap-2 mb-1">
                                <span className="font-medium">Input:</span>
                                <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded">{test.input}</code>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-medium">Output:</span>
                                <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded">{test.expected}</code>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white text-center">
                          <div className="text-xl font-semibold mb-0.5">🎉 All Tests Passed!</div>
                          <div className="text-xs opacity-90">+50 XP Earned</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {testCases.map((test, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Test Case {idx + 1}</span>
                              <span className="text-gray-400 text-xs">Pending</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <div>Input: <code>{test.input}</code></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="max-w-3xl mx-auto">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8 border-2 border-green-200 dark:border-green-800">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4 animate-bounce">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Perfect Score!</h3>
                      <p className="text-lg text-gray-600 dark:text-gray-300">All test cases passed successfully</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">3/3</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tests Passed</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">+50</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">XP Earned</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">98%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Efficiency</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3">📊 Performance Analysis</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400">Code Quality</span>
                            <span className="font-semibold text-gray-900 dark:text-white">Excellent</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: '95%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400">Time Complexity</span>
                            <span className="font-semibold text-gray-900 dark:text-white">O(n)</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: '90%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="max-w-4xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Chat Interface */}
                    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                            <span className="text-2xl">🤖</span>
                          </div>
                          <div>
                            <div className="font-bold text-white">AI Tutor</div>
                            <div className="text-xs text-white/80">Always here to help</div>
                          </div>
                          <div className="ml-auto">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 h-96 overflow-y-auto space-y-4">
                        {chatMessages.length === 0 ? (
                          <div className="text-center text-gray-400 mt-20">
                            <div className="text-4xl mb-2">💬</div>
                            <p>Ask me anything about coding!</p>
                          </div>
                        ) : (
                          chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}>
                              <div className={`max-w-[80%] p-3 rounded-2xl ${
                                msg.role === 'user' 
                                  ? 'bg-blue-600 text-white rounded-br-sm' 
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-bl-sm'
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type your question..."
                            className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-shadow">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* AI Features */}
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">AI-Powered Features</h3>
                      
                      {[
                        {
                          icon: "🎯",
                          title: "Socratic Method",
                          description: "Guides you to discover solutions through thoughtful questions",
                          color: "from-blue-500 to-cyan-500"
                        },
                        {
                          icon: "💡",
                          title: "Smart Hints",
                          description: "Progressive hints that adapt to your level of understanding",
                          color: "from-purple-500 to-pink-500"
                        },
                        {
                          icon: "🔍",
                          title: "Code Analysis",
                          description: "Detailed feedback on code quality and best practices",
                          color: "from-green-500 to-emerald-500"
                        },
                        {
                          icon: "📚",
                          title: "Learning Path",
                          description: "Personalized recommendations based on your progress",
                          color: "from-orange-500 to-red-500"
                        }
                      ].map((feature, idx) => (
                        <div key={idx} className="group p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-xl transition-all duration-300 cursor-pointer">
                          <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity`}></div>
                          <div className="relative flex items-start gap-4">
                            <div className="text-3xl">{feature.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 dark:text-white mb-1">{feature.title}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="max-w-5xl mx-auto">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-8 border-2 border-indigo-200 dark:border-indigo-800">
                    <div className="text-center mb-8">
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Live Collaboration Session</h3>
                      <p className="text-gray-600 dark:text-gray-300">Work together in real-time with synchronized editing</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      {/* Participants */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                          </svg>
                          Active Participants
                        </h4>
                        <div className="space-y-3">
                          {[
                            { name: "Sarah Chen (You)", role: "Student", color: "bg-blue-500", active: true },
                            { name: "Mr. Johnson", role: "Teacher", color: "bg-purple-500", active: true },
                            { name: "Alex Kim", role: "Peer", color: "bg-green-500", active: true }
                          ].map((user, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className={`w-10 h-10 ${user.color} rounded-full flex items-center justify-center text-white font-bold`}>
                                {user.name[0]}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 dark:text-white">{user.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{user.role}</div>
                              </div>
                              {user.active && (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  Active
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Features */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4">Collaboration Features</h4>
                        <div className="space-y-3">
                          {[
                            { icon: "⚡", text: "Real-time cursor tracking", active: true },
                            { icon: "💬", text: "In-session messaging", active: true },
                            { icon: "🎥", text: "Screen sharing", active: false },
                            { icon: "📝", text: "Shared code snapshots", active: true },
                            { icon: "🔔", text: "Smart notifications", active: true }
                          ].map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <span className="text-2xl">{feature.icon}</span>
                              <span className="flex-1 text-gray-900 dark:text-white">{feature.text}</span>
                              {feature.active && (
                                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Code Editor Preview */}
                    <div className="bg-[#1e1e1e] rounded-xl p-6 relative overflow-hidden">
                      <div className="absolute top-4 right-4 flex gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse shadow-lg shadow-purple-500/50" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <div className="text-green-400 font-mono text-sm mb-2">// Collaborative editing in progress...</div>
                      <div className="text-gray-300 font-mono text-sm space-y-1">
                        <div><span className="text-purple-400">function</span> <span className="text-yellow-400">collaborate</span>() {"{"}</div>
                        <div className="pl-4"><span className="text-blue-400">const</span> magic = <span className="text-orange-400">"Real-time sync"</span>;</div>
                        <div className="pl-4 flex items-center gap-2">
                          <span className="text-blue-400">return</span> magic;
                          <div className="w-2 h-4 bg-blue-500 animate-pulse"></div>
                        </div>
                        <div>{"}"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 5 && (
                <div className="max-w-5xl mx-auto">
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {/* Progress Stats */}
                    {[
                      { label: "Total XP", value: "2,450", icon: "⭐", color: "from-yellow-500 to-orange-500" },
                      { label: "Current Level", value: "12", icon: "🏆", color: "from-purple-500 to-pink-500" },
                      { label: "Day Streak", value: "15", icon: "🔥", color: "from-red-500 to-orange-500" }
                    ].map((stat, idx) => (
                      <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-xl`}>
                        <div className="text-4xl mb-2">{stat.icon}</div>
                        <div className="text-3xl font-bold mb-1">{stat.value}</div>
                        <div className="text-sm opacity-90">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Learning Progress</h3>
                    <div className="space-y-4">
                      {[
                        { course: "JavaScript Fundamentals", progress: 85, xp: 420, color: "bg-yellow-500" },
                        { course: "Python Basics", progress: 65, xp: 320, color: "bg-blue-500" },
                        { course: "Web Development", progress: 92, xp: 510, color: "bg-purple-500" },
                        { course: "Data Structures", progress: 40, xp: 180, color: "bg-green-500" }
                      ].map((course, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-semibold text-gray-900 dark:text-white">{course.course}</span>
                            <span className="text-gray-600 dark:text-gray-400">{course.progress}% • {course.xp} XP</span>
                          </div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${course.color} rounded-full transition-all duration-1000 ease-out`}
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Achievements */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Recent Achievements</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { icon: "🎓", name: "Quick Learner", desc: "Complete 5 lessons in a day" },
                        { icon: "💯", name: "Perfect Score", desc: "Get 100% on a challenge" },
                        { icon: "🔥", name: "On Fire", desc: "15-day learning streak" },
                        { icon: "🤝", name: "Team Player", desc: "Join 10 collaborations" }
                      ].map((achievement, idx) => (
                        <div key={idx} className="group p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-yellow-400 dark:hover:border-yellow-500 transition-all duration-300 cursor-pointer hover:scale-105">
                          <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{achievement.icon}</div>
                          <div className="font-bold text-gray-900 dark:text-white text-sm mb-1">{achievement.name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{achievement.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 6 && (
                <div className="max-w-6xl mx-auto">
                  {/* Contest Header */}
                  <div className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 rounded-2xl p-8 mb-8 text-white text-center">
                    <div className="text-6xl mb-4">🏆</div>
                    <h3 className="text-3xl font-bold mb-2">Weekly Coding Challenge</h3>
                    <p className="text-lg opacity-90 mb-4">Compete with 1,247 participants worldwide</p>
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-lg font-semibold">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Time Remaining: 2d 14h 32m
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Leaderboard */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span>🥇</span> Global Leaderboard
                      </h3>
                      <div className="space-y-3">
                        {[
                          { rank: 1, name: "CodeMaster_99", score: 2850, medal: "🥇", color: "bg-yellow-500" },
                          { rank: 2, name: "AlgoQueen", score: 2720, medal: "🥈", color: "bg-gray-400" },
                          { rank: 3, name: "ByteNinja", score: 2650, medal: "🥉", color: "bg-orange-600" },
                          { rank: 4, name: "DevWizard", score: 2580, medal: "4", color: "bg-blue-500" },
                          { rank: 5, name: "PyMaster", score: 2510, medal: "5", color: "bg-purple-500" },
                          { rank: "...", name: "...", score: "...", medal: "", color: "bg-gray-500" },
                          { rank: 47, name: "You", score: 1840, medal: "47", color: "bg-green-500", highlight: true }
                        ].map((player, idx) => (
                          <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                            player.highlight 
                              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500 dark:border-green-400' 
                              : 'bg-gray-50 dark:bg-gray-700 hover:shadow-lg'
                          }`}>
                            <div className={`w-12 h-12 ${player.color} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                              {player.medal}
                            </div>
                            <div className="flex-1">
                              <div className={`font-bold ${player.highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                {player.name}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Rank #{player.rank}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg text-gray-900 dark:text-white">{player.score}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">points</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Challenge Problems */}
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Challenge Problems</h3>
                      <div className="space-y-4">
                        {[
                          { 
                            title: "Two Sum Variation", 
                            difficulty: "Medium", 
                            points: 500, 
                            solved: 892, 
                            total: 1247,
                            diffColor: "bg-yellow-500",
                            status: "solved"
                          },
                          { 
                            title: "Binary Tree Traversal", 
                            difficulty: "Hard", 
                            points: 800, 
                            solved: 456, 
                            total: 1247,
                            diffColor: "bg-red-500",
                            status: "attempted"
                          },
                          { 
                            title: "Dynamic Programming", 
                            difficulty: "Hard", 
                            points: 1000, 
                            solved: 234, 
                            total: 1247,
                            diffColor: "bg-red-500",
                            status: "locked"
                          }
                        ].map((problem, idx) => (
                          <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">{problem.title}</h4>
                                  {problem.status === "solved" && (
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`px-3 py-1 ${problem.diffColor} text-white text-xs font-semibold rounded-full`}>
                                    {problem.difficulty}
                                  </span>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {problem.solved}/{problem.total} solved
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">+{problem.points}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">points</div>
                              </div>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
                                style={{ width: `${(problem.solved / problem.total) * 100}%` }}
                              ></div>
                            </div>
                            <button className={`mt-4 w-full py-2 rounded-lg font-semibold transition-all ${
                              problem.status === "solved" 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                : problem.status === "locked"
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}>
                              {problem.status === "solved" ? "✓ Solved" : problem.status === "locked" ? "🔒 Locked" : "Start Challenge"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 7 && (
                <div className="max-w-6xl mx-auto">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Discussion Feed */}
                    <div className="md:col-span-2">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">💬 Recent Discussions</h3>
                      <div className="space-y-4">
                        {[
                          {
                            author: "Sarah M.",
                            avatar: "S",
                            title: "How to optimize this bubble sort implementation?",
                            content: "I've written this bubble sort but it's running slow on large arrays. Any suggestions?",
                            upvotes: 24,
                            replies: 12,
                            tags: ["algorithms", "optimization"],
                            time: "2 hours ago",
                            isSolution: false
                          },
                          {
                            author: "Alex K.",
                            avatar: "A",
                            title: "Solved: Understanding JavaScript Closures",
                            content: "Finally understood closures! Here's a simple explanation that helped me...",
                            upvotes: 156,
                            replies: 43,
                            tags: ["javascript", "tutorial"],
                            time: "5 hours ago",
                            isSolution: true
                          },
                          {
                            author: "Mike R.",
                            avatar: "M",
                            title: "Best practices for async/await error handling?",
                            content: "What's the recommended approach for handling errors in async functions?",
                            upvotes: 89,
                            replies: 27,
                            tags: ["javascript", "async"],
                            time: "1 day ago",
                            isSolution: false
                          }
                        ].map((discussion, idx) => (
                          <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                            <div className="flex items-start gap-4">
                              {/* Upvote Section */}
                              <div className="flex flex-col items-center gap-2">
                                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                  <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <span className="font-bold text-lg text-gray-900 dark:text-white">{discussion.upvotes}</span>
                                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                  <svg className="w-6 h-6 text-gray-400 group-hover:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>

                              {/* Content */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {discussion.avatar}
                                  </div>
                                  <span className="font-semibold text-gray-900 dark:text-white">{discussion.author}</span>
                                  <span className="text-sm text-gray-500">•</span>
                                  <span className="text-sm text-gray-500">{discussion.time}</span>
                                  {discussion.isSolution && (
                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                                      ✓ Solution
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {discussion.title}
                                </h4>
                                <p className="text-gray-600 dark:text-gray-400 mb-3">{discussion.content}</p>
                                <div className="flex items-center gap-3">
                                  {discussion.tags.map((tag, tagIdx) => (
                                    <span key={tagIdx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-full">
                                      #{tag}
                                    </span>
                                  ))}
                                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm ml-auto">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                    </svg>
                                    {discussion.replies} replies
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                      {/* Trending Topics */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4">🔥 Trending Topics</h4>
                        <div className="space-y-3">
                          {[
                            { tag: "react-hooks", count: 234 },
                            { tag: "algorithms", count: 189 },
                            { tag: "python", count: 156 },
                            { tag: "data-structures", count: 142 },
                            { tag: "web-dev", count: 128 }
                          ].map((topic, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">#{topic.tag}</span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">{topic.count} posts</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Contributors */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4">⭐ Top Contributors</h4>
                        <div className="space-y-3">
                          {[
                            { name: "DevMaster", points: 2450, badge: "🥇" },
                            { name: "CodeGuru", points: 1890, badge: "🥈" },
                            { name: "PyExpert", points: 1654, badge: "🥉" }
                          ].map((contributor, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <span className="text-2xl">{contributor.badge}</span>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 dark:text-white">{contributor.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{contributor.points} points</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 8 && (
                <div className="max-w-6xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Class Management */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span>📚</span> My Classes
                      </h3>
                      <div className="space-y-4">
                        {[
                          { name: "Computer Science 101", students: 28, active: 12, pending: 3, color: "from-blue-500 to-cyan-500" },
                          { name: "Advanced Python", students: 18, active: 8, pending: 1, color: "from-purple-500 to-pink-500" },
                          { name: "Web Development", students: 32, active: 15, pending: 5, color: "from-green-500 to-emerald-500" }
                        ].map((classItem, idx) => (
                          <div key={idx} className={`bg-gradient-to-r ${classItem.color} rounded-xl p-6 text-white`}>
                            <h4 className="font-bold text-xl mb-4">{classItem.name}</h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold">{classItem.students}</div>
                                <div className="text-sm opacity-90">Students</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold flex items-center justify-center gap-1">
                                  {classItem.active}
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                </div>
                                <div className="text-sm opacity-90">Active Now</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold">{classItem.pending}</div>
                                <div className="text-sm opacity-90">Need Help</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Help Requests */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span>🙋</span> Active Help Requests
                      </h3>
                      <div className="space-y-4">
                        {[
                          { 
                            student: "Emily Chen", 
                            lesson: "Recursion Basics", 
                            waitTime: "2m", 
                            priority: "high",
                            message: "Stuck on factorial function implementation"
                          },
                          { 
                            student: "James Wilson", 
                            lesson: "Arrays & Loops", 
                            waitTime: "5m", 
                            priority: "medium",
                            message: "Need help with nested loops"
                          },
                          { 
                            student: "Sofia Rodriguez", 
                            lesson: "OOP Concepts", 
                            waitTime: "8m", 
                            priority: "low",
                            message: "Clarification on inheritance"
                          }
                        ].map((request, idx) => (
                          <div key={idx} className={`p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                            request.priority === "high" 
                              ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20' 
                              : request.priority === "medium"
                              ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                              : 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                  {request.student[0]}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white">{request.student}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">{request.lesson}</div>
                                </div>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                request.priority === "high"
                                  ? 'bg-red-500 text-white'
                                  : request.priority === "medium"
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-green-500 text-white'
                              }`}>
                                ⏱ {request.waitTime}
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 italic">"{request.message}"</p>
                            <div className="flex gap-2">
                              <button className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all">
                                Accept & Join
                              </button>
                              <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all">
                                Message
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Student Progress Overview */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 mt-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📊 Student Progress Overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {[
                        { label: "Avg. Completion", value: "73%", icon: "📈", color: "text-green-600 dark:text-green-400" },
                        { label: "Active Students", value: "45/78", icon: "👥", color: "text-blue-600 dark:text-blue-400" },
                        { label: "Pending Reviews", value: "12", icon: "📝", color: "text-orange-600 dark:text-orange-400" },
                        { label: "Avg. Score", value: "85%", icon: "⭐", color: "text-yellow-600 dark:text-yellow-400" }
                      ].map((stat, idx) => (
                        <div key={idx} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                          <div className="text-4xl mb-2">{stat.icon}</div>
                          <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 9 && (
                <div className="max-w-5xl mx-auto">
                  {/* Achievement Showcase */}
                  <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 rounded-3xl p-12 text-center text-white mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    <div className="relative z-10">
                      <div className="text-8xl mb-4 animate-bounce">🎓</div>
                      <h3 className="text-4xl font-bold mb-2">Course Completion Certificate</h3>
                      <p className="text-xl opacity-90 mb-6">JavaScript Fundamentals Mastery</p>
                      <div className="inline-block px-8 py-4 bg-white/20 backdrop-blur-sm rounded-2xl border-2 border-white/50">
                        <div className="text-sm opacity-90 mb-1">Certified Developer</div>
                        <div className="text-3xl font-bold">Sarah Chen</div>
                      </div>
                    </div>
                  </div>

                  {/* Badges Grid */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🏆 Achievement Badges</h3>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                      {[
                        { icon: "🎯", name: "First Steps", desc: "Complete first lesson", unlocked: true },
                        { icon: "🔥", name: "Hot Streak", desc: "7-day streak", unlocked: true },
                        { icon: "💯", name: "Perfectionist", desc: "100% on 5 lessons", unlocked: true },
                        { icon: "🚀", name: "Speed Demon", desc: "Complete in record time", unlocked: true },
                        { icon: "🤝", name: "Collaborator", desc: "Join 10 sessions", unlocked: true },
                        { icon: "📚", name: "Bookworm", desc: "Complete 3 courses", unlocked: true },
                        { icon: "⭐", name: "Rising Star", desc: "Reach level 10", unlocked: true },
                        { icon: "💬", name: "Helper", desc: "Answer 20 questions", unlocked: false },
                        { icon: "🏅", name: "Champion", desc: "Win a contest", unlocked: false },
                        { icon: "👑", name: "Master", desc: "Complete all courses", unlocked: false }
                      ].map((badge, idx) => (
                        <div key={idx} className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                          badge.unlocked
                            ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 hover:scale-110 cursor-pointer'
                            : 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 opacity-50'
                        }`}>
                          <div className={`text-5xl mb-2 ${badge.unlocked ? 'animate-pulse' : 'grayscale'}`}>
                            {badge.icon}
                          </div>
                          <div className="text-xs font-bold text-gray-900 dark:text-white text-center">
                            {badge.name}
                          </div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {badge.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certificates */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { course: "JavaScript Fundamentals", date: "Jan 15, 2026", score: 95, gradient: "from-blue-500 to-cyan-500" },
                      { course: "Python Basics", date: "Dec 20, 2025", score: 88, gradient: "from-purple-500 to-pink-500" },
                      { course: "Web Development", date: "Nov 10, 2025", score: 92, gradient: "from-green-500 to-emerald-500" }
                    ].map((cert, idx) => (
                      <div key={idx} className={`bg-gradient-to-br ${cert.gradient} rounded-2xl p-8 text-white relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 text-white/10 text-9xl font-bold">🎓</div>
                        <div className="relative z-10">
                          <div className="text-sm opacity-90 mb-2">Certificate of Completion</div>
                          <h4 className="text-2xl font-bold mb-4">{cert.course}</h4>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm opacity-90">Completed</div>
                              <div className="font-semibold">{cert.date}</div>
                            </div>
                            <div>
                              <div className="text-sm opacity-90">Final Score</div>
                              <div className="text-3xl font-bold">{cert.score}%</div>
                            </div>
                          </div>
                          <button className="mt-4 w-full py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg font-semibold transition-all border border-white/50">
                            Download Certificate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Share Section */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 mt-8 text-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Share Your Achievements</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Show off your accomplishments on social media and professional networks
                    </p>
                    <div className="flex justify-center gap-4">
                      {[
                        { name: "LinkedIn", color: "bg-blue-600", icon: "in" },
                        { name: "Twitter", color: "bg-sky-500", icon: "𝕏" },
                        { name: "Facebook", color: "bg-blue-700", icon: "f" }
                      ].map((social, idx) => (
                        <button key={idx} className={`px-6 py-3 ${social.color} hover:opacity-90 text-white font-semibold rounded-xl transition-all shadow-lg`}>
                          Share on {social.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="px-5 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium rounded-full transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              ← Previous
            </button>

            <div className="flex gap-1.5">
              {demoSteps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    activeStep === idx ? 'bg-blue-600 w-8' : 'bg-gray-300 dark:bg-gray-600 w-1.5'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setActiveStep(Math.min(demoSteps.length - 1, activeStep + 1))}
              disabled={activeStep === demoSteps.length - 1}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
            >
              Next →
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center shadow-xl">
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-3">
            Ready to Start Your Journey?
          </h2>
          <p className="text-sm md:text-base text-white/90 mb-6 max-w-2xl mx-auto font-light">
            Join thousands of students learning to code with AI-powered assistance,
            real-time collaboration, and instant feedback.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-white text-blue-600 text-sm font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Get Started Free
            </Link>
            <Link
              href="/courses"
              className="px-6 py-2.5 bg-white/10 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold rounded-full hover:bg-white/20 transition-all duration-300"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.6s ease-out forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.7);
        }
      `}</style>
    </div>
  );
}
