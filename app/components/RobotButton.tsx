"use client";

import { useState } from "react";

export default function RobotButton({ onClick }: { onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 group z-50"
      title="Platform Assistant - Get help navigating BitByBit"
    >
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full bg-linear-to-r from-violet-600 via-purple-600 to-fuchsia-600 opacity-75 blur-xl group-hover:blur-2xl transition-all duration-300 animate-pulse" />
      
      {/* Main button */}
      <div className="relative w-20 h-20 rounded-full bg-linear-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-[3px] shadow-2xl transform group-hover:scale-110 transition-all duration-300">
        {/* Inner gradient */}
        <div className="w-full h-full rounded-full bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center relative overflow-hidden">
          
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-br from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 animate-spin-slow" />
          
          {/* Sparkle effect */}
          <div className="absolute inset-0">
            <div className="absolute top-3 left-3 w-1 h-1 bg-white rounded-full animate-ping" />
            <div className="absolute bottom-4 right-5 w-1 h-1 bg-purple-300 rounded-full animate-ping animation-delay-300" />
            <div className="absolute top-6 right-3 w-0.5 h-0.5 bg-fuchsia-300 rounded-full animate-ping animation-delay-700" />
          </div>

          {/* AI Icon */}
          <div className="relative z-10">
            <svg 
              className="w-10 h-10 text-white group-hover:text-purple-200 transition-colors duration-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {/* Circuit brain design */}
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" />
              <circle cx="15" cy="9" r="1.5" fill="currentColor" />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9 9h6M9 12h6" 
                className={isHovered ? "opacity-100" : "opacity-50"}
              />
            </svg>
          </div>

          {/* Status indicator */}
          <div className="absolute bottom-2 right-2">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip on hover */}
      {isHovered && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-xl border border-purple-500/50 whitespace-nowrap animate-fade-in">
          Ask AI Assistant
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </button>
  );
}
