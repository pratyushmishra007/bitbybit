/**
 * Multi-Language Code Execution API
 * Uses Piston API for sandboxed execution of Python, JavaScript, TypeScript, C++, and more
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkRateLimit, RATE_LIMITS, getClientIdentifier } from '@/lib/rate-limiter';

// Piston API endpoint
const PISTON_API = 'https://emkc.org/api/v2/piston';

// Language to Piston runtime mapping
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  'javascript': { language: 'javascript', version: '18.15.0' },
  'python': { language: 'python', version: '3.10.0' },
  'typescript': { language: 'typescript', version: '5.0.3' },
  'cpp': { language: 'c++', version: '10.2.0' },
  'c++': { language: 'c++', version: '10.2.0' },
  'c': { language: 'c', version: '10.2.0' },
  'java': { language: 'java', version: '15.0.2' },
  'go': { language: 'go', version: '1.16.2' },
  'rust': { language: 'rust', version: '1.68.2' },
  'ruby': { language: 'ruby', version: '3.0.1' },
  'php': { language: 'php', version: '8.2.3' },
};

// Execute code using Piston API
async function executeCode(code: string, language: string, input: string = ''): Promise<{ output: string; error: string }> {
  try {
    const runtime = LANGUAGE_MAP[language.toLowerCase()];
    
    if (!runtime) {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Prepare code with input handling for different languages
    let finalCode = code;
    
    // For languages that need input wrapper
    if (input && input.trim()) {
      if (language === 'python') {
        // Python: make input available via input() or as variable
        finalCode = `input_data = ${JSON.stringify(input)}\n${code}`;
      } else if (language === 'javascript' || language === 'typescript') {
        // JavaScript/TypeScript: make input available as variable
        finalCode = `const input = ${JSON.stringify(input)};\n${code}`;
      } else if (language === 'cpp' || language === 'c++') {
        // C++: input needs to be handled via stdin
        // User code should use cin or scanf
      }
    }

    const response = await fetch(`${PISTON_API}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [
          {
            name: getFileName(language),
            content: finalCode,
          },
        ],
        stdin: input || '',
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Piston API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      output: result.run?.stdout || '',
      error: result.run?.stderr || result.compile?.stderr || '',
    };
    
  } catch (error: any) {
    return {
      output: '',
      error: error.message || 'Execution failed',
    };
  }
}

// Get filename based on language
function getFileName(language: string): string {
  const fileMap: Record<string, string> = {
    'javascript': 'script.js',
    'python': 'main.py',
    'typescript': 'index.ts',
    'java': 'Main.java',
    'cpp': 'main.cpp',
    'c++': 'main.cpp',
    'c': 'main.c',
    'ruby': 'main.rb',
    'go': 'main.go',
    'php': 'index.php',
    'rust': 'main.rs',
  };
  return fileMap[language.toLowerCase()] || 'script.js';
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const userId = (session.user as { id?: string })?.id;
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const clientId = getClientIdentifier(userId, ip);
    
    const rateLimitResult = checkRateLimit(`code-exec:${clientId}`, RATE_LIMITS.codeExecution);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before making more requests.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        }
      );
    }

    const body = await req.json();
    const { code, language, testCases } = body;

    if (!code || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If no test cases, just run the code once
    if (!testCases || testCases.length === 0) {
      const result = await executeCode(code, language);
      
      return NextResponse.json({
        success: !result.error,
        output: result.output || result.error,
        error: result.error,
      });
    }

    // Execute code against test cases
    const results = [];
    let output = '';

    for (const testCase of testCases) {
      try {
        const result = await executeCode(code, language, testCase.input);
        
        const actual = result.output.trim();
        const hasError = result.error && result.error.trim().length > 0;
        const passed = !hasError && actual === testCase.expectedOutput.trim();
        
        results.push({
          passed,
          input: testCase.input,
          expected: testCase.expectedOutput,
          actual: hasError ? `Error: ${result.error}` : actual,
        });

        output += `Test Case: ${testCase.input}\n`;
        output += `Expected: ${testCase.expectedOutput}\n`;
        output += `Actual: ${hasError ? 'Error: ' + result.error : actual}\n`;
        output += `Status: ${passed ? '✓ PASS' : '✗ FAIL'}\n\n`;
        
      } catch (error: any) {
        results.push({
          passed: false,
          input: testCase.input,
          expected: testCase.expectedOutput,
          actual: `Error: ${error.message}`,
        });
        
        output += `Test Case: ${testCase.input}\n`;
        output += `Error: ${error.message}\n\n`;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      output,
      allPassed: results.every(r => r.passed),
    });
    
  } catch (error: any) {
    console.error('Code execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Execution failed' },
      { status: 500 }
    );
  }
}
