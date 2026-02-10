"use client";

import { useState } from "react";

export default function IntroButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 left-8 z-40 group"
        aria-label="Introduction"
      >
        <div className="relative">
          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 opacity-75 blur-md group-hover:blur-lg animate-pulse"></div>
          
          {/* Main button */}
          <div className="relative bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 rounded-full p-1 shadow-2xl">
            <div className="bg-white dark:bg-gray-900 rounded-full px-6 py-4 flex items-center gap-3 group-hover:bg-opacity-95 transition-all">
              <div className="text-2xl animate-wave">👋</div>
              <div className="text-left">
                <div className="text-sm font-bold bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Hi, I'm Pratyush!
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Click to learn more
                </div>
              </div>
            </div>
          </div>

          {/* Notification dot */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-bounce"></div>
        </div>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 animate-slideUp">
            {/* Header */}
            <div className="sticky top-0 bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 p-6 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-5xl animate-wave">👋</div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Hi, I'm Pratyush!
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Creator of BitByBit
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors p-1"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              {/* Welcome Message */}
              <div className="bg-linear-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Coming from my <span className="font-semibold text-blue-600 dark:text-blue-400">resume/portfolio</span>? Check out the{" "}
                  <a href="/demo" className="font-bold text-transparent bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text hover:underline">
                    Demo Page
                  </a>{" "}
                  to see everything in action! 🎯
                </p>
              </div>

              {/* Quick Setup */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-xl">🚀</span>
                  Want Full Access? Here's How:
                </h3>
                
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-xl">👤</div>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">Sign up</span>
                      <span className="text-gray-600 dark:text-gray-400"> as Individual or School/College</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-xl">🎫</div>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">Roll Number:</span>
                      <span className="text-gray-600 dark:text-gray-400"> Use any format you want</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-xl">🏢</div>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">Organization:</span>
                      <code className="ml-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono text-xs">BITBYBIT</code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security & Approval */}
              <div className="bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-5 border-2 border-amber-300 dark:border-amber-700">
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-2xl shrink-0">🔒</div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white mb-1">
                      Admin Approval Required
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      After signup, click below to request access. <span className="font-semibold text-amber-700 dark:text-amber-400">You'll be approved within 12-24 hours.</span>
                    </p>
                  </div>
                </div>
                <a
                  href="mailto:pratyushdinesh56@gmail.com?subject=BitByBit%20Access%20Request&body=Hi%20Pratyush%2C%0A%0AI%20would%20like%20to%20request%20access%20to%20the%20BitByBit%20platform.%0A%0AMy%20details%3A%0A-%20Name%3A%20%0A-%20Email%3A%20%0A-%20Role%3A%20%5BIndividual%20Learner%20%2F%20School-College%5D%0A-%20Organization%3A%20BITBYBIT%0A%0AThank%20you!%0A"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Access Request Email
                </a>
              </div>

              {/* Demo Note */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-lg">💡</div>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  All classrooms are demo environments—feel free to explore!
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 p-6 rounded-b-2xl border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setIsDismissed(true);
                  setIsOpen(false);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Don't Show Again
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-20deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-wave {
          animation: wave 2s ease-in-out infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

      `}</style>
    </>
  );
}
