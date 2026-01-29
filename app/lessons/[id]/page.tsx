"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DiscussionForum from "@/app/components/DiscussionForum";

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  content: string;
  xp_reward: number;
  order_index: number;
  duration_minutes: number;
  language?: string;
  starter_code?: string;
  solution_code?: string;
  hints?: string[];
  expected_output?: string;
  test_cases?: TestCase[];
}

interface TestCase {
  input: string;
  expectedOutput: string;
  description: string;
  hidden?: boolean;
}

interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
  category: string;
  difficulty: string;
  tags: string[];
}

interface PageParams {
  params: Promise<{ id: string }>;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function LessonPage({ params }: PageParams) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lessonId, setLessonId] = useState<string>("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [code, setCode] = useState("// Write your code here\nconsole.log('Hello, World!');\n");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [validationPassed, setValidationPassed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'output' | 'tests'>('output');
  const [testResults, setTestResults] = useState<Array<{id: string, passed: boolean, input: string, expected: string, actual: string, hidden: boolean}>>([]);
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "👋 Hi! I'm your AI coding assistant. Ask me anything about this lesson!" }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [expectedOutput, setExpectedOutput] = useState<string>("");
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [userNote, setUserNote] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hints, setHints] = useState<string[]>([
    "💡 Try using console.log() to print messages",
    "💡 Remember to use semicolons at the end of statements",
    "💡 Check the console for any error messages"
  ]);
  const [solution, setSolution] = useState<string>("// Solution example\nconsole.log('Hello, World!');");
  
  // Raise Hand state
  const [helpRequestId, setHelpRequestId] = useState<string | null>(null);
  const [helpRequestStatus, setHelpRequestStatus] = useState<string>("");
  const [raisingHand, setRaisingHand] = useState(false);

  // Multi-language syntax highlighting
  const highlightCode = (code: string, language: string = 'javascript') => {
    // Escape HTML first
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (language === 'python') {
      // Python syntax highlighting
      highlighted = highlighted
        // Comments (do first to avoid conflicts)
        .replace(/(#.*$)/gm, '<span style="color: #6a9955;">$1</span>')
        // Strings
        .replace(/(".*?"|'.*?'|"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')/g, '<span style="color: #ce9178;">$1</span>')
        // Keywords
        .replace(/\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|lambda|yield|pass|break|continue|and|or|not|is|in|True|False|None)\b/g, '<span style="color: #569cd6;">$1</span>')
        // Built-in functions
        .replace(/\b(print|len|range|str|int|float|list|dict|set|tuple)\b/g, '<span style="color: #4ec9b0;">$1</span>')
        // Numbers
        .replace(/\b(\d+)\b/g, '<span style="color: #b5cea8;">$1</span>')
        // Functions
        .replace(/\b(\w+)(?=\()/g, '<span style="color: #dcdcaa;">$1</span>');
    } else {
      // JavaScript syntax highlighting (default)
      highlighted = highlighted
        // Comments (do first)
        .replace(/(\/\/.*$)/gm, '<span style="color: #6a9955;">$1</span>')
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: #6a9955;">$1</span>')
        // Strings
        .replace(/(".*?"|'.*?'|`.*?`)/g, '<span style="color: #ce9178;">$1</span>')
        // Keywords
        .replace(/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|import|export|from|default|async|await|try|catch|finally|throw|new|this|super|static|typeof|instanceof|in|of|delete|void|yield|debugger)\b/g, '<span style="color: #569cd6;">$1</span>')
        // console methods
        .replace(/\b(console)\b/g, '<span style="color: #4ec9b0;">$1</span>')
        // Numbers
        .replace(/\b(\d+)\b/g, '<span style="color: #b5cea8;">$1</span>')
        // Functions
        .replace(/\b(\w+)(?=\()/g, '<span style="color: #dcdcaa;">$1</span>');
    }

    // Wrap entire content in a span with default text color to ensure visibility
    return `<span style="color: #d4d4d4;">${highlighted}</span>`;
  };

  useEffect(() => {
    params.then((resolvedParams) => {
      setLessonId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && lessonId) {
      fetchLesson();
    }
  }, [status, lessonId, router]);

  const fetchLesson = async () => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}`);
      
      if (!response.ok) {
        console.error("Failed to fetch lesson:", response.status);
        router.push("/courses");
        return;
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error("Lesson not found");
        router.push("/courses");
        return;
      }

      setLesson(data.lesson);
      setIsCompleted(data.isCompleted || false);
      
      // Reset validation state
      setValidationPassed(false);
      setConsoleOutput([]);
      
      // Load starter code from lesson if available, otherwise use default
      if (data.lesson.starter_code) {
        setCode(data.lesson.starter_code);
      } else {
        setCode(data.lesson.language === 'python' 
          ? '# Write your code here\nprint("Hello, World!")'
          : '// Write your code here\nconsole.log("Hello, World!");'
        );
      }
      
      // Load hints from lesson if available
      if (data.lesson.hints && data.lesson.hints.length > 0) {
        setHints(data.lesson.hints);
      }
      
      // Load solution from lesson if available
      if (data.lesson.solution_code) {
        setSolution(data.lesson.solution_code);
      }
      
      // Load expected output from lesson
      if (data.lesson.expected_output) {
        setExpectedOutput(data.lesson.expected_output);
      }
      
      // Fetch code snippets for this language
      if (data.lesson.language) {
        fetchCodeSnippets(data.lesson.language);
      }
      
      // Fetch user's note for this lesson
      fetchUserNote();
      
      // Check if lesson is bookmarked
      fetchBookmarkStatus();
    } catch (error) {
      console.error("Failed to fetch lesson:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCodeSnippets = async (language: string) => {
    try {
      const response = await fetch(`/api/snippets?language=${language}`);
      if (response.ok) {
        const data = await response.json();
        setSnippets(data.snippets || []);
      }
    } catch (error) {
      console.error("Failed to fetch snippets:", error);
    }
  };
  
  const fetchUserNote = async () => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}/note`);
      if (response.ok) {
        const data = await response.json();
        setUserNote(data.note || "");
      }
    } catch (error) {
      console.error("Failed to fetch note:", error);
    }
  };
  
  const fetchBookmarkStatus = async () => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}/bookmark`);
      if (response.ok) {
        const data = await response.json();
        setIsBookmarked(data.isBookmarked || false);
      }
    } catch (error) {
      console.error("Failed to fetch bookmark status:", error);
    }
  };
  
  const toggleBookmark = async () => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}/bookmark`, {
        method: isBookmarked ? 'DELETE' : 'POST',
      });
      if (response.ok) {
        setIsBookmarked(!isBookmarked);
      }
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
    }
  };
  
  const saveNote = async () => {
    try {
      await fetch(`/api/lessons/${lessonId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userNote }),
      });
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 20 && newWidth < 80) {
      setLeftPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to run code
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode();
      }
      // Ctrl+S or Cmd+S to mark as complete (if not already)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isCompleted && !completing) {
          handleComplete();
        }
      }
      // ? to show keyboard shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        // Only trigger if not in an input/textarea (unless it's the code editor)
        if (target.tagName !== 'INPUT' || target.classList.contains('code-editor')) {
          e.preventDefault();
          setShowShortcuts(true);
        }
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setShowHints(false);
        setShowAI(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [code, isCompleted, completing]);

  const validateTestCases = async (sampleOnly: boolean = false): Promise<boolean> => {
    if (!lesson || !lesson.test_cases || !Array.isArray(lesson.test_cases)) return true;
    
    // Filter test cases based on mode
    const testCasesToRun = sampleOnly 
      ? lesson.test_cases.filter((tc: any) => !tc.hidden) 
      : lesson.test_cases;
    
    if (testCasesToRun.length === 0) {
      return true; // No tests to run
    }

    try {
      // Call the execution API with test cases
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: lesson.language || 'javascript',
          testCases: testCasesToRun.map((tc: any) => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setConsoleOutput([`Execution Error: ${errorData.error || 'Failed to execute code'}`]);
        setTestResults([]);
        return false;
      }

      const data = await response.json();
      
      // Map results back with hidden property
      const results = data.results.map((result: any, index: number) => ({
        id: `test-${index}`,
        passed: result.passed,
        input: result.input,
        expected: result.expected,
        actual: result.actual,
        hidden: testCasesToRun[index]?.hidden || false,
      }));

      setTestResults(results);
      
      // Set output message
      const passedCount = results.filter((r: any) => r.passed).length;
      const totalCount = results.length;
      
      if (data.allPassed) {
        setConsoleOutput([`✓ All ${totalCount} test${totalCount > 1 ? 's' : ''} passed!`]);
        // If sample tests passed, set validation to true
        if (sampleOnly) {
          setValidationPassed(true);
        }
      } else {
        setConsoleOutput([`${passedCount}/${totalCount} test${totalCount > 1 ? 's' : ''} passed. Check the Test Cases tab for details.`]);
        setValidationPassed(false);
      }

      return data.allPassed;
      
    } catch (error: any) {
      console.error('Test execution error:', error);
      setConsoleOutput([`Error: ${error.message || 'Failed to execute test cases'}`]);
      setTestResults([]);
      return false;
    }
  };

  const handleComplete = async () => {
    if (!lesson || completing) return;
    
    // Check if there are test cases
    const hasTestCases = lesson.test_cases && Array.isArray(lesson.test_cases) && lesson.test_cases.length > 0;
    
    if (hasTestCases) {
      // Validate against ALL test cases (including hidden ones)
      setConsoleOutput(['⏳ Running all test cases (including hidden)...']);
      const allPassed = await validateTestCases(false);
      
      if (!allPassed) {
        setConsoleTab('tests');
        setConsoleOutput([
          '❌ Cannot complete lesson yet!',
          '',
          '⚠️ Your code must pass all test cases.',
          '',
          '💡 Check the "Test Cases" tab to see which tests failed.',
          `Failed: ${testResults.filter(t => !t.passed).length}/${testResults.length} test cases`
        ]);
        return;
      }
    } else if (expectedOutput && !validationPassed) {
      // Check if validation passed (if expected output exists and no test cases)
      setConsoleOutput([
        '❌ Cannot complete lesson yet!',
        '',
        '⚠️ Your code output doesn\'t match the expected output.',
        '',
        '💡 Run your code and make sure it produces the correct output.',
        `Expected output: ${expectedOutput}`
      ]);
      return;
    }

    setCompleting(true);
    try {
      const response = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          courseId: lesson.course_id,
          xpEarned: lesson.xp_reward,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Complete failed:", errorText);
        setConsoleOutput(["❌ Failed to complete lesson. Please try again."]);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setIsCompleted(true);
        setShowSuccess(true);
        setConsoleOutput([
          "✓ Congratulations! Lesson completed successfully.",
          `+${lesson.xp_reward} XP earned!`,
          data.leveledUp ? "🎉 LEVEL UP! You've reached a new level!" : "",
          "Great job! Ready for the next challenge?",
        ].filter(Boolean));
        
        // Force reload to refresh all data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else if (data.error === "Already completed") {
        setIsCompleted(true);
        setConsoleOutput(["✓ You've already completed this lesson!"]);
      }
    } catch (error) {
      console.error("Failed to complete lesson:", error);
      setConsoleOutput(["❌ Failed to complete lesson. Please try again."]);
    } finally {
      setCompleting(false);
    }
  };

  const runCode = async () => {
    setConsoleOutput(['⏳ Running code...']);
    setShowSuccess(false);

    try {
      // If there are test cases, run SAMPLE test cases only (non-hidden)
      const hasTestCases = lesson && lesson.test_cases && Array.isArray(lesson.test_cases) && lesson.test_cases.length > 0;
      
      if (hasTestCases) {
        // Run sample test cases using the API
        await validateTestCases(true); // true = sample only
        setConsoleTab('tests');
        setShowSuccess(true);
      } else {
        // No test cases - execute code normally via API for output
        const response = await fetch('/api/execute-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language: lesson?.language || 'javascript',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setConsoleOutput([`❌ Error: ${errorData.error || 'Failed to execute code'}`]);
          setShowSuccess(false);
          return;
        }

        const data = await response.json();
        
        if (data.error) {
          setConsoleOutput([`❌ Error: ${data.error}`, '', '💡 Check your code for syntax errors and try again.']);
          setShowSuccess(false);
        } else {
          const output = data.output || '';
          const resultOutput = output.length > 0 
            ? output.split('\n').map((line: string) => '📝 ' + line)
            : ["✓ Code executed successfully with no console output!"];
          
          setConsoleOutput(resultOutput);
          
          // Check against expected output if it exists
          if (expectedOutput && output.length > 0) {
            const actualOutput = output.trim();
            const cleanExpectedOutput = expectedOutput.split('\n').map((line: string) => line.trim()).join('\n').trim();
            
            if (actualOutput === cleanExpectedOutput) {
              setValidationPassed(true);
              setConsoleOutput([
                ...resultOutput, 
                '', 
                '✅ Perfect! Output matches expected result!',
                '🎯 You can now complete this lesson!'
              ]);
            } else {
              setValidationPassed(false);
              setConsoleOutput([
                ...resultOutput, 
                '', 
                '❌ Output doesn\'t match expected result.',
                '',
                'Expected:',
                cleanExpectedOutput,
                '',
                'Got:',
                actualOutput,
                '',
                '💡 Tip: Check your code and try again!'
              ]);
            }
          } else if (expectedOutput && output.length === 0) {
            setValidationPassed(false);
            setConsoleOutput([
              ...resultOutput,
              '',
              '⚠️ No output detected.',
              '💡 Make sure you\'re using console.log() or print() to display output.'
            ]);
          } else {
            setValidationPassed(true);
          }
          
          setShowSuccess(true);
        }
      }
    } catch (error: any) {
      setConsoleOutput([`❌ Error: ${error.message}`, '', '💡 Check your code for syntax errors and try again.']);
      setShowSuccess(false);
    }
  };

  const sendAIMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;

    const userMessage = aiInput.trim();
    setAiInput("");
    setAiMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setAiLoading(true);

    setTimeout(() => {
      let response = "";
      const lowerMsg = userMessage.toLowerCase();
      
      // Code analysis helpers
      if (lowerMsg.includes("function") || lowerMsg.includes("functions")) {
        response = "**Functions in JavaScript:**\n\n" +
          "Functions are reusable blocks of code that perform specific tasks. Here's how to use them:\n\n" +
          "```javascript\n// Function declaration\nfunction greet(name) {\n  return 'Hello, ' + name;\n}\n\n" +
          "// Arrow function\nconst greet = (name) => 'Hello, ' + name;\n\n" +
          "// Usage\nconsole.log(greet('World'));\n```\n\n" +
          "💡 Tip: Use meaningful function names that describe what they do!";
      } else if (lowerMsg.includes("variable") || lowerMsg.includes("variables")) {
        response = "**Variables in JavaScript:**\n\n" +
          "Variables store data values:\n\n" +
          "```javascript\n// Use 'let' for values that change\nlet count = 0;\ncount = count + 1;\n\n" +
          "// Use 'const' for constants\nconst PI = 3.14;\n\n" +
          "// Avoid 'var' in modern JavaScript\n```\n\n" +
          "💡 Tip: Choose descriptive names like 'userAge' instead of 'x'!";
      } else if (lowerMsg.includes("loop") || lowerMsg.includes("loops") || lowerMsg.includes("for") || lowerMsg.includes("while")) {
        response = "**Loops in JavaScript:**\n\n" +
          "Loops help you repeat actions:\n\n" +
          "```javascript\n// For loop - when you know how many times\nfor (let i = 0; i < 5; i++) {\n  console.log(i);\n}\n\n" +
          "// While loop - when condition-based\nlet count = 0;\nwhile (count < 5) {\n  console.log(count);\n  count++;\n}\n\n" +
          "// forEach - for arrays\n[1,2,3].forEach(num => console.log(num));\n```";
      } else if (lowerMsg.includes("array") || lowerMsg.includes("arrays")) {
        response = "**Arrays in JavaScript:**\n\n" +
          "Arrays store multiple values:\n\n" +
          "```javascript\nconst fruits = ['apple', 'banana', 'orange'];\n\n" +
          "// Access elements\nconsole.log(fruits[0]); // 'apple'\n\n" +
          "// Add elements\nfruits.push('grape');\n\n" +
          "// Loop through\nfruits.forEach(fruit => console.log(fruit));\n```\n\n" +
          "💡 Useful methods: map(), filter(), reduce(), find()";
      } else if (lowerMsg.includes("object") || lowerMsg.includes("objects")) {
        response = "**Objects in JavaScript:**\n\n" +
          "Objects store key-value pairs:\n\n" +
          "```javascript\nconst person = {\n  name: 'John',\n  age: 30,\n  greet: function() {\n    return 'Hi, I\\'m ' + this.name;\n  }\n};\n\n" +
          "console.log(person.name); // 'John'\nconsole.log(person.greet()); // 'Hi, I\\'m John'\n```";
      } else if (lowerMsg.includes("help") || lowerMsg.includes("stuck") || lowerMsg.includes("don't understand")) {
        response = "**I'm here to help! 🤝**\n\n" +
          "Here's what you can do:\n\n" +
          "1. 📖 **Read the lesson** carefully - it contains all the key information\n" +
          "2. 💡 **Click 'Hints'** in the status bar for helpful tips\n" +
          "3. 🧪 **Experiment** in the code editor - try things out!\n" +
          "4. 🔍 **Check the console** for error messages\n" +
          "5. ❓ **Ask specific questions** - I can explain concepts in detail\n\n" +
          "What specific part is challenging you?";
      } else if (lowerMsg.includes("error") || lowerMsg.includes("bug") || lowerMsg.includes("not working")) {
        response = "**Debugging Help 🐛**\n\n" +
          "Let's fix this together:\n\n" +
          "1. **Read the error message** - it usually tells you exactly what's wrong\n" +
          "2. **Check for typos** - variable names, function names, etc.\n" +
          "3. **Look for missing brackets** - { }, ( ), [ ]\n" +
          "4. **Check semicolons** - while optional, they can prevent issues\n" +
          "5. **Console.log()** - add logs to see what values you're working with\n\n" +
          "Common errors:\n" +
          "• `undefined is not a function` - typo or variable not defined\n" +
          "• `Unexpected token` - syntax error, missing bracket\n" +
          "• `Cannot read property of undefined` - accessing property on undefined value\n\n" +
          "Share the error message and I can help more specifically!";
      } else if (lowerMsg.includes("console.log") || lowerMsg.includes("console log") || lowerMsg.includes("print")) {
        response = "**Using console.log() 📝**\n\n" +
          "```javascript\n// Print simple values\nconsole.log('Hello, World!');\nconsole.log(42);\n\n" +
          "// Print variables\nlet name = 'Alice';\nconsole.log(name);\n\n" +
          "// Print multiple values\nconsole.log('Name:', name, 'Age:', 25);\n\n" +
          "// Debug objects\nconst user = {name: 'Bob'};\nconsole.log('User:', user);\n```\n\n" +
          "💡 Use console.log() to see what your code is doing!";
      } else if (lowerMsg.includes("solution") || lowerMsg.includes("answer")) {
        response = "**Finding the Solution 💭**\n\n" +
          "I encourage you to try solving it yourself first! Here's why:\n\n" +
          "✅ You'll learn better by doing\n" +
          "✅ You'll remember the concept longer\n" +
          "✅ You'll build problem-solving skills\n\n" +
          "However, if you're really stuck:\n" +
          "1. Click the **'Hints'** button for clues\n" +
          "2. The hints panel also has the full solution\n" +
          "3. Try understanding the solution, not just copying it\n\n" +
          "Want me to explain a specific concept instead?";
      } else if (code && (lowerMsg.includes("code") || lowerMsg.includes("my code") || lowerMsg.includes("review"))) {
        response = "**Code Review 👨‍💻**\n\n" +
          "I can see your code! Here are some general tips:\n\n" +
          "• Make sure your syntax is correct (brackets, semicolons)\n" +
          "• Use meaningful variable names\n" +
          "• Add console.log() to see what's happening\n" +
          "• Test small parts of your code separately\n\n" +
          "Try running your code with **Ctrl+Enter** to see the output!\n\n" +
          "If you have a specific question about your code, ask away!";
      } else {
        response = "**Great question! 🤔**\n\n" +
          (lesson ? `For this lesson on **"${lesson.title}"**, ` : "") +
          "I'm here to help you understand JavaScript concepts.\n\n" +
          "**You can ask me about:**\n" +
          "• Variables, functions, loops, arrays, objects\n" +
          "• How to fix errors in your code\n" +
          "• JavaScript syntax and best practices\n" +
          "• Specific concepts from the lesson\n\n" +
          "**Quick tips:**\n" +
          "• Use **Ctrl+Enter** to run your code\n" +
          "• Click **Hints** for helpful clues\n" +
          "• Experiment in the code editor!\n\n" +
          "What would you like to learn more about?";
      }
      
      setAiMessages(prev => [...prev, { role: "assistant", content: response }]);
      setAiLoading(false);
    }, 1200);
  };

  // Raise Hand - Request teacher help
  const raiseHand = async () => {
    if (helpRequestId) {
      setConsoleOutput(["⚠️ You already have a pending help request. Please wait for a teacher."]);
      return;
    }
    
    setRaisingHand(true);
    try {
      const response = await fetch("/api/help-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lessonId,
          courseId: lesson?.course_id,
          codeSnapshot: code,
          language: lesson?.language || "javascript",
          message: "I need help with this lesson",
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setHelpRequestId(data.helpRequest.id);
        setHelpRequestStatus("pending");
        setConsoleOutput([
          "🖐️ Hand raised! A teacher will help you soon.",
          "⏳ Waiting for teacher response...",
          "",
          "Your current code has been saved for the teacher to review.",
        ]);
        
        // Start polling for teacher response
        checkForTeacherResponse(data.helpRequest.id);
      } else {
        setConsoleOutput([`❌ ${data.error || "Failed to raise hand"}`]);
      }
    } catch (error) {
      console.error("Error raising hand:", error);
      setConsoleOutput(["❌ Error requesting help. Please try again."]);
    } finally {
      setRaisingHand(false);
    }
  };

  // Check if teacher has responded (poll every 3 seconds)
  const checkForTeacherResponse = (requestId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/help-requests?status=all`);
        const data = await response.json();
        
        if (data.success) {
          const myRequest = data.helpRequests.find((req: any) => req.id === requestId);
          
          if (myRequest && myRequest.status === "accepted" && myRequest.collaboration_session_id) {
            clearInterval(pollInterval);
            setHelpRequestStatus("accepted");
            setConsoleOutput([
              "✅ A teacher is ready to help you!",
              "🎓 Redirecting to collaboration session...",
            ]);
            
            // Redirect to collaboration session
            setTimeout(() => {
              router.push(`/collaborate/${myRequest.collaboration_session_id}`);
            }, 2000);
          } else if (myRequest && myRequest.status === "cancelled") {
            clearInterval(pollInterval);
            setHelpRequestId(null);
            setHelpRequestStatus("");
            setConsoleOutput(["ℹ️ Help request was cancelled."]);
          }
        }
      } catch (error) {
        console.error("Error checking for teacher response:", error);
      }
    }, 3000);

    // Stop polling after 30 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 30 * 60 * 1000);
  };

  // Cancel help request
  const cancelHelpRequest = async () => {
    if (!helpRequestId) return;
    
    try {
      const response = await fetch(`/api/help-requests?id=${helpRequestId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setHelpRequestId(null);
        setHelpRequestStatus("");
        setConsoleOutput(["ℹ️ Help request cancelled."]);
      }
    } catch (error) {
      console.error("Error cancelling help request:", error);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your lesson...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return null;
  }

  return (
    <div className="h-screen bg-[#1e1e1e] flex flex-col overflow-hidden">
      {/* VS Code-style top bar */}
      <div className="bg-[#323233] border-b border-gray-900 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/courses/${lesson.course_id}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </Link>
          
          <div className="h-4 w-px bg-gray-700"></div>
          
          <button
            onClick={() => {
              fetch(`/api/courses/${lesson.course_id}`)
                .then(res => res.json())
                .then(data => {
                  const currentIndex = lesson.order_index;
                  const prevLesson = data.lessons?.find((l: Lesson) => l.order_index === currentIndex - 1);
                  if (prevLesson) {
                    router.push(`/lessons/${prevLesson.id}`);
                  }
                });
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={lesson.order_index === 1}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            <span className="text-sm">Previous</span>
          </button>
          
          <button
            onClick={() => {
              fetch(`/api/courses/${lesson.course_id}`)
                .then(res => res.json())
                .then(data => {
                  const currentIndex = lesson.order_index;
                  const nextLesson = data.lessons?.find((l: Lesson) => l.order_index === currentIndex + 1);
                  if (nextLesson) {
                    router.push(`/lessons/${nextLesson.id}`);
                  }
                });
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
          >
            <span className="text-sm">Next</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Collaborate Button */}
          <Link
            href="/collaborate"
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 transition-colors group"
            title="Join Collaboration Session"
          >
            <svg className="w-4 h-4 text-purple-400 group-hover:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-purple-400 font-medium text-xs group-hover:text-purple-300">Collaborate</span>
          </Link>
          
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-blue-600/20 border border-blue-500/30">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-blue-400 font-medium text-xs">+{lesson.xp_reward} XP</span>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-green-600/20 border border-green-500/30">
              <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-400 font-medium text-xs">Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Lesson content */}
        <div className="bg-[#252526] border-r border-gray-900 overflow-hidden flex flex-col" style={{ width: `${leftPanelWidth}%` }}>
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* Lesson header */}
            <div className="mb-8">
              <div className="inline-block px-4 py-1 rounded bg-blue-600/20 border border-blue-500/30 mb-4">
                <span className="text-blue-400 text-sm font-semibold">Lesson {lesson.order_index}</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-100 mb-4">
                {lesson.title}
              </h2>
              <p className="text-gray-400 text-base leading-relaxed">{lesson.description}</p>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{lesson.duration_minutes} min</span>
                </div>
              </div>
            </div>

            {/* Lesson content with premium styling */}
            <div className="border-t border-gray-700 pt-6"></div>
            <div 
              className="lesson-content"
              dangerouslySetInnerHTML={{ __html: formatContent(lesson.content) }}
            />
            
            {/* Discussion Forum Section */}
            <div className="mt-12">
              <h3 className="text-2xl font-bold text-gray-100 mb-4">💬 Discussion</h3>
              <DiscussionForum
                lessonId={lessonId}
                courseId={lesson.course_id}
              />
            </div>
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="w-1 bg-gray-900 hover:bg-blue-600 cursor-col-resize transition-colors relative group"
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-600/20"></div>
        </div>

        {/* Right panel - Code editor */}
        <div className="flex-1 flex flex-col">
          {/* Code editor */}
          <div className="flex-1 bg-[#1e1e1e] border-l border-gray-900 overflow-hidden flex flex-col">
            {/* Editor tabs - VS Code style */}
            <div className="flex items-center gap-0 px-2 py-0 bg-[#252526] border-b border-gray-800">
              <div className="px-4 py-2 bg-[#1e1e1e] text-gray-300 text-sm flex items-center gap-2 border-t-2 border-blue-500">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                  <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">
                  {lesson?.language === 'python' ? 'main.py' : 
                   lesson?.language === 'typescript' ? 'index.ts' :
                   lesson?.language === 'java' ? 'Main.java' :
                   lesson?.language === 'cpp' || lesson?.language === 'c++' ? 'main.cpp' :
                   lesson?.language === 'c' ? 'main.c' :
                   lesson?.language === 'go' ? 'main.go' :
                   lesson?.language === 'rust' ? 'main.rs' :
                   lesson?.language === 'ruby' ? 'main.rb' :
                   lesson?.language === 'php' ? 'index.php' :
                   'script.js'}
                </span>
                <button className="ml-2 hover:bg-gray-700 rounded p-0.5">
                  <svg className="w-3 h-3 text-gray-500 hover:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Code area */}
            <div className="flex-1 relative overflow-hidden bg-[#1e1e1e]">
              {/* Syntax highlighted overlay */}
              <pre 
                className="absolute inset-0 p-6 pl-14 font-mono text-sm pointer-events-none overflow-auto custom-scrollbar"
                style={{
                  fontFamily: "'Consolas', 'Courier New', monospace",
                  lineHeight: "1.6",
                  tabSize: 2,
                  fontWeight: 400,
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  color: '#d4d4d4'
                }}
                dangerouslySetInnerHTML={{ __html: highlightCode(code, lesson?.language || 'javascript') }}
              />
              
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="relative w-full h-full bg-transparent text-transparent caret-white p-6 font-mono text-sm resize-none focus:outline-none pl-14 selection:bg-blue-600/50"
                style={{
                  fontFamily: "'Consolas', 'Courier New', monospace",
                  lineHeight: "1.6",
                  tabSize: 2,
                  fontWeight: 400,
                }}
                spellCheck={false}
                placeholder="// Start coding..."
              />
              
              {/* Line numbers */}
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#1e1e1e] border-r border-gray-800 flex flex-col p-6 text-gray-600 text-sm font-mono pointer-events-none select-none">
                {code.split('\n').map((_, i) => (
                  <div key={i} className="leading-[1.7]">{i + 1}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Console output */}
          <div className="h-48 bg-[#1e1e1e] border-t border-gray-900 overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#252526] border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm font-medium">Console</span>
                {validationPassed && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-400 rounded-full blur-lg opacity-50"></div>
                    <div className="relative w-6 h-6 bg-linear-to-r from-emerald-400 to-green-400 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
                {expectedOutput && !validationPassed && consoleOutput.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30">
                    <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-400 text-xs font-medium">Validation Required</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setConsoleOutput([])}
                className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm custom-scrollbar bg-[#1e1e1e]">
              {consoleTab === 'output' ? (
                // Output Tab
                consoleOutput.length === 0 ? (
                  <div className="space-y-3">
                    <div className="text-gray-600">Run your code to see output...</div>
                    {expectedOutput && (
                      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span className="text-blue-400 text-xs font-semibold">Expected Output:</span>
                        </div>
                        <div className="text-gray-300 text-xs whitespace-pre-wrap">{expectedOutput}</div>
                        <div className="mt-2 text-gray-500 text-xs">👆 Your code should produce this exact output</div>
                      </div>
                    )}
                  </div>
                ) : (
                  consoleOutput.map((line, i) => (
                    <div 
                      key={i} 
                      className={`mb-1.5 ${
                        line.includes('❌') || line.includes('Error') ? 'text-red-400 font-semibold' : 
                        line.includes('✅') || line.includes('🎉') || line.includes('🎯') ? 'text-emerald-400 font-semibold' : 
                        line.includes('⚠️') || line.includes('Expected:') || line.includes('Got:') ? 'text-yellow-400' :
                        line.includes('💡') ? 'text-blue-400' :
                        'text-[#cccccc]'
                      }`}
                    >
                      {line}
                    </div>
                  ))
                )
              ) : (
                // Test Cases Tab
                <div className="space-y-3">
                  {testResults.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                      <div className="text-4xl mb-2">🧪</div>
                      <div>Run your code to test against sample test cases</div>
                      <div className="text-xs mt-2">Click "Complete Lesson" to test all cases (including hidden)</div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
                        <span className="text-xs text-gray-400">
                          Showing {testResults.filter(t => !t.hidden).length} sample test case(s)
                        </span>
                        <span className={`text-xs font-semibold ${
                          testResults.every(t => t.passed) ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {testResults.filter(t => t.passed).length}/{testResults.length} Passed
                        </span>
                      </div>
                      {testResults.map((result, i) => (
                        <div
                          key={result.id}
                          className={`p-3 rounded border ${
                            result.passed
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-red-500/10 border-red-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-300">
                                Test Case #{i + 1}
                              </span>
                              {result.hidden && (
                                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded border border-purple-500/30">
                                  🔒 HIDDEN
                                </span>
                              )}
                            </div>
                            <span className={`text-xs font-bold ${
                              result.passed ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {result.passed ? '✅ PASSED' : '❌ FAILED'}
                            </span>
                          </div>
                          {result.input && !result.hidden && (
                            <div className="mb-2">
                              <span className="text-gray-500 text-xs">Input: </span>
                              <span className="text-blue-300 text-xs font-mono">{result.input}</span>
                            </div>
                          )}
                          {result.hidden ? (
                            <div className="text-xs text-gray-500 italic">
                              Hidden test case details only shown after completion
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <div className="text-gray-500 mb-1">Expected:</div>
                                <div className="bg-[#252526] p-2 rounded text-green-300 font-mono">{result.expected}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 mb-1">Got:</div>
                                <div className={`bg-[#252526] p-2 rounded font-mono ${
                                  result.passed ? 'text-green-300' : 'text-red-300'
                                }`}>{result.actual}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VS Code-style status bar */}
      <div className="bg-[#007ACC] border-t border-gray-900 px-4 py-1 flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <span className="text-white font-medium">{lesson.title}</span>
          <div className="flex items-center gap-2 text-white/80">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">{lesson.duration_minutes} min</span>
          </div>
          {lesson.language && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/10 text-white/90">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium capitalize">{lesson.language}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={toggleBookmark}
            className={`px-3 py-1 rounded hover:bg-white/10 transition-colors text-xs font-medium flex items-center gap-1.5 ${
              isBookmarked ? 'text-yellow-400' : 'text-white/60 hover:text-white'
            }`}
            title={isBookmarked ? "Remove bookmark" : "Bookmark lesson"}
          >
            <svg className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowSnippets(!showSnippets)}
            className="px-3 py-1 rounded hover:bg-white/10 transition-colors text-white text-xs font-medium flex items-center gap-2"
            title="Code Snippets Library"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Snippets
          </button>
          
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="px-3 py-1 rounded hover:bg-white/10 transition-colors text-white text-xs font-medium flex items-center gap-2"
            title="Lesson Notes"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Notes
          </button>
          
          <button
            onClick={() => setShowHints(!showHints)}
            className="px-4 py-1 rounded hover:bg-white/10 transition-colors text-white text-xs font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Hints
          </button>
          
          <button
            onClick={() => setShowAI(!showAI)}
            className="px-4 py-1 rounded hover:bg-white/10 transition-colors text-white text-xs font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Ask AI
          </button>
          
          {/* Raise Hand Button */}
          {!helpRequestId ? (
            <button
              onClick={raiseHand}
              disabled={raisingHand}
              className="px-4 py-1 rounded bg-yellow-600 hover:bg-yellow-700 transition-colors text-white text-xs font-medium flex items-center gap-2 disabled:opacity-50"
              title="Need help? Raise your hand to get teacher assistance"
            >
              {raisingHand ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Requesting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                  </svg>
                  🖐️ Raise Hand
                </>
              )}
            </button>
          ) : (
            <button
              onClick={cancelHelpRequest}
              className="px-4 py-1 rounded bg-orange-600 hover:bg-orange-700 transition-colors text-white text-xs font-medium flex items-center gap-2 animate-pulse"
              title="Cancel help request"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              ⏳ Waiting for Teacher
            </button>
          )}
          
          <button
            onClick={runCode}
            className="px-4 py-1 rounded bg-green-600 hover:bg-green-700 transition-colors text-white text-xs font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Run Code
          </button>
          
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/share', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: lesson?.title || 'My Code',
                    description: `Solution for ${lesson?.title}`,
                    code: code,
                    language: lesson?.language || 'javascript',
                    lessonId: lessonId,
                    courseId: lesson?.course_id
                  })
                });
                const data = await response.json();
                if (data.shareId) {
                  setConsoleOutput([
                    '✅ Code shared successfully!',
                    `Share link: ${window.location.origin}/share/${data.shareId}`,
                    'Link copied to clipboard!'
                  ]);
                  navigator.clipboard.writeText(`${window.location.origin}/share/${data.shareId}`);
                } else {
                  setConsoleOutput(['❌ Failed to share code']);
                }
              } catch (error) {
                setConsoleOutput(['❌ Error sharing code']);
              }
            }}
            className="px-4 py-1 rounded bg-purple-600 hover:bg-purple-700 transition-colors text-white text-xs font-medium flex items-center gap-2"
            title="Share your code with the community"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
          
          <button
            onClick={() => setShowShortcuts(true)}
            className="px-3 py-1 rounded hover:bg-white/10 transition-colors text-white/60 hover:text-white text-xs font-medium flex items-center gap-1.5"
            title="Keyboard Shortcuts"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="text-[10px]">?</span>
          </button>
          
          {!isCompleted ? (
            <button
              onClick={handleComplete}
              disabled={completing || (lesson?.test_cases && lesson.test_cases.length > 0 && !validationPassed) || (!!expectedOutput && (!lesson?.test_cases || lesson.test_cases.length === 0) && !validationPassed)}
              className={`px-4 py-1 rounded transition-colors text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                validationPassed ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              title={
                lesson?.test_cases && lesson.test_cases.length > 0 && !validationPassed 
                  ? 'Pass all test cases first' 
                  : (!!expectedOutput && (!lesson?.test_cases || lesson.test_cases.length === 0) && !validationPassed ? 'Run your code and pass validation first' : 'Complete this lesson')
              }
            >
              {completing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Submitting...
                </>
              ) : validationPassed ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Complete Lesson
                </>
              ) : (
                <>
                  {expectedOutput && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                  Complete Lesson
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                fetch(`/api/courses/${lesson.course_id}`)
                  .then(res => res.json())
                  .then(data => {
                    const currentIndex = lesson.order_index;
                    const nextLesson = data.lessons?.find((l: Lesson) => l.order_index === currentIndex + 1);
                    if (nextLesson) {
                      router.push(`/lessons/${nextLesson.id}`);
                    } else {
                      router.push(`/courses/${lesson.course_id}`);
                    }
                  });
              }}
              className="px-4 py-1 rounded bg-green-600 hover:bg-green-700 transition-colors text-white text-xs font-medium flex items-center gap-2"
            >
              Next Lesson
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* AI Assistant Panel */}
      {showAI && (
        <div className="absolute bottom-10 right-8 w-96 h-[500px] rounded-lg bg-[#252526] border border-gray-800 shadow-2xl flex flex-col overflow-hidden z-50">
          {/* Header */}
          <div className="bg-[#2d2d30] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">AI Assistant</h3>
                <p className="text-gray-500 text-xs">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setShowAI(false)}
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#1e1e1e]">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2d2d30] text-gray-300 border border-gray-700'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-[#2d2d30] text-gray-300 border border-gray-700 px-4 py-2 rounded">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce animation-delay-150"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce animation-delay-300"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-[#2d2d30] border-t border-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendAIMessage()}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 rounded bg-[#1e1e1e] border border-gray-700 text-gray-300 placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 transition-all"
              />
              <button
                onClick={sendAIMessage}
                disabled={!aiInput.trim() || aiLoading}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <div className="bg-[#252526] border border-gray-800 rounded-lg shadow-2xl w-[500px] max-h-[600px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-medium">Keyboard Shortcuts</h3>
                  <p className="text-gray-500 text-xs">Work faster with shortcuts</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 bg-[#1e1e1e] overflow-y-auto max-h-[500px] custom-scrollbar">
              <div className="space-y-6">
                {/* Code Execution */}
                <div>
                  <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Code Execution
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-[#2d2d30] border border-gray-700 rounded p-3">
                      <span className="text-gray-300 text-sm">Run code</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-gray-900 text-gray-300 rounded text-xs font-mono border border-gray-700">Ctrl</kbd>
                        <span className="text-gray-600">+</span>
                        <kbd className="px-2 py-1 bg-gray-900 text-gray-300 rounded text-xs font-mono border border-gray-700">Enter</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lesson Progress */}
                <div>
                  <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Lesson Progress
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-[#2d2d30] border border-gray-700 rounded p-3">
                      <span className="text-gray-300 text-sm">Mark as complete</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-gray-900 text-gray-300 rounded text-xs font-mono border border-gray-700">Ctrl</kbd>
                        <span className="text-gray-600">+</span>
                        <kbd className="px-2 py-1 bg-gray-900 text-gray-300 rounded text-xs font-mono border border-gray-700">S</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interface */}
                <div>
                  <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Interface
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-[#2d2d30] border border-gray-700 rounded p-3">
                      <span className="text-gray-300 text-sm">Show keyboard shortcuts</span>
                      <kbd className="px-2 py-1 bg-gray-900 text-gray-300 rounded text-xs font-mono border border-gray-700">?</kbd>
                    </div>
                    <div className="flex items-center justify-between bg-[#2d2d30] border border-gray-700 rounded p-3">
                      <span className="text-gray-300 text-sm">Close modals</span>
                      <kbd className="px-2 py-1 bg-gray-900 text-gray-300 rounded text-xs font-mono border border-gray-700">Esc</kbd>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <h5 className="text-blue-400 font-medium text-sm mb-1">Pro Tip</h5>
                      <p className="text-gray-300 text-xs leading-relaxed">
                        On Mac, use <kbd className="px-1 py-0.5 bg-gray-900 text-gray-300 rounded text-xs font-mono">Cmd</kbd> instead of <kbd className="px-1 py-0.5 bg-gray-900 text-gray-300 rounded text-xs font-mono">Ctrl</kbd>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hints Panel */}
      {showHints && (
        <div className="fixed top-16 right-6 w-96 h-[500px] bg-[#252526] border border-gray-800 rounded-lg shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Hints & Solution</h3>
                <p className="text-gray-500 text-xs">Need some help?</p>
              </div>
            </div>
            <button
              onClick={() => setShowHints(false)}
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#1e1e1e]">
            <div className="space-y-3">
              <h4 className="text-white font-medium text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
                Hints
              </h4>
              {hints.map((hint, i) => (
                <div key={i} className="bg-[#2d2d30] border border-gray-700 rounded p-3">
                  <p className="text-gray-300 text-sm" style={{ color: '#d4d4d4' }}>{hint}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-800">
              <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Solution
              </h4>
              <div className="bg-[#2d2d30] border border-gray-700 rounded p-4">
                <pre 
                  className="text-sm font-mono overflow-x-auto custom-scrollbar"
                  style={{ color: '#d4d4d4' }}
                  dangerouslySetInnerHTML={{ __html: highlightCode(solution, lesson?.language || 'javascript') }}
                />
              </div>
              <button
                onClick={() => setCode(solution)}
                className="mt-3 w-full px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Solution to Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Snippets Panel */}
      {showSnippets && (
        <div className="fixed top-16 right-6 w-[450px] h-[600px] bg-[#252526] border border-gray-800 rounded-lg shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Code Snippets</h3>
                <p className="text-gray-500 text-xs">{lesson?.language ? lesson.language.charAt(0).toUpperCase() + lesson.language.slice(1) : 'JavaScript'} patterns</p>
              </div>
            </div>
            <button
              onClick={() => setShowSnippets(false)}
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#1e1e1e]">
            {snippets.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-gray-500 text-sm">No snippets available yet</p>
                <p className="text-gray-600 text-xs mt-1">Check back soon!</p>
              </div>
            ) : (
              snippets.map((snippet, i) => (
                <div key={i} className="bg-[#2d2d30] border border-gray-700 rounded-lg overflow-hidden">
                  <div className="p-3 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-white font-medium text-sm">{snippet.title}</h4>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                        {snippet.category}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{snippet.description}</p>
                  </div>
                  <div className="p-3 bg-[#1e1e1e]">
                    <pre 
                      className="text-xs font-mono overflow-x-auto custom-scrollbar"
                      dangerouslySetInnerHTML={{ __html: highlightCode(snippet.code, snippet.language) }}
                    />
                  </div>
                  <div className="p-2 border-t border-gray-700">
                    <button
                      onClick={() => {
                        setCode(code + '\n\n' + snippet.code);
                        setShowSnippets(false);
                      }}
                      className="w-full px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add to Editor
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Notes Panel */}
      {showNotes && (
        <div className="fixed top-16 right-6 w-96 h-[500px] bg-[#252526] border border-gray-800 rounded-lg shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Lesson Notes</h3>
                <p className="text-gray-500 text-xs">Your personal notes</p>
              </div>
            </div>
            <button
              onClick={() => setShowNotes(false)}
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 bg-[#1e1e1e] flex flex-col">
            <textarea
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              onBlur={saveNote}
              placeholder="Take notes about this lesson...&#10;&#10;• Key concepts&#10;• Things to remember&#10;• Questions to explore"
              className="flex-1 bg-[#2d2d30] border border-gray-700 rounded p-3 text-gray-300 text-sm resize-none focus:outline-none focus:border-blue-500 transition-all placeholder-gray-600"
              style={{ fontFamily: "'Inter', system-ui, sans-serif", lineHeight: "1.6" }}
            />
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-gray-600">Auto-saved</span>
              <span className="text-gray-600">{userNote.length} characters</span>
            </div>
          </div>
        </div>
      )}

      {/* Global styles */}
      <style jsx global>{`
        nav, [class*="robot"], [class*="RobotButton"] {
          display: none !important;
        }
        body {
          padding-top: 0 !important;
          margin: 0 !important;
        }
        body > div {
          padding-top: 0 !important;
        }
        #__next {
          padding-top: 0 !important;
        }
        
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-150 {
          animation-delay: 0.15s;
        }
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e1e1e;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #424242;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4e4e4e;
        }
        
        .lesson-content {
          color: #d4d4d4 !important;
        }
        .lesson-content * {
          color: #d4d4d4 !important;
        }
        .lesson-content h1 {
          color: #e5e5e5 !important;
          font-size: 2rem;
          font-weight: 600;
          margin: 2.5rem 0 1.25rem;
          line-height: 1.3;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #3c3c3c;
        }
        .lesson-content h2 {
          color: #e5e5e5 !important;
          font-size: 1.5rem;
          font-weight: 600;
          margin: 2rem 0 1rem;
          line-height: 1.4;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #2d2d2d;
        }
        .lesson-content h3 {
          color: #e5e5e5 !important;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1.5rem 0 0.75rem;
          padding-left: 0.75rem;
          border-left: 3px solid #569cd6;
        }
        .lesson-content p {
          color: #d4d4d4 !important;
          line-height: 1.8;
          margin: 1rem 0;
        }
        .lesson-content strong {
          color: #4fc3f7 !important;
          font-weight: 600;
        }
        .lesson-content code {
          background: #2d2d30;
          color: #ce9178 !important;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-family: 'Consolas', 'Courier New', monospace;
          font-size: 0.875rem;
          border: 1px solid #454545;
        }
        .lesson-content pre {
          background: #1e1e1e;
          border: 1px solid #3c3c3c;
          border-radius: 0.5rem;
          padding: 1.5rem;
          overflow-x: auto;
          margin: 1.5rem 0;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        .lesson-content pre code {
          background: none !important;
          border: none !important;
          color: #d4d4d4 !important;
          padding: 0;
          display: block;
          line-height: 1.6;
        }
        .lesson-content ul, .lesson-content ol {
          margin: 1.25rem 0;
          padding-left: 2.5rem;
          list-style-position: outside;
        }
        .lesson-content li {
          color: #d4d4d4 !important;
          margin: 0.5rem 0;
          line-height: 1.7;
          padding: 0;
          background: transparent;
          border: none;
        }
        .lesson-content li::marker {
          color: #569cd6 !important;
        }
        .lesson-content blockquote {
          border-left: 3px solid #4fc3f7;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #b8b8b8 !important;
          font-style: italic;
        }
        .lesson-content a {
          color: #4fc3f7 !important;
          text-decoration: none;
        }
        .lesson-content a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

function formatContent(content: string): string {
  let html = content;
  
  // Headers
  html = html.replace(/^### (.+)$/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Code blocks
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Lists
  html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
  
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[123]>)/g, '$1');
  html = html.replace(/(<\/h[123]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  
  return html;
}
