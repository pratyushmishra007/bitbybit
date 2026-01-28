import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Support both Azure OpenAI and regular OpenAI
const openai = process.env.AZURE_OPENAI_ENDPOINT
  ? new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
      defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
      defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY },
    })
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

// Knowledge base about the application
const APPLICATION_CONTEXT = `
You are an AI assistant for BitByBit, an AI-powered coding education platform.

# ABOUT BITBYBIT:

BitByBit is a comprehensive coding education platform that combines:
- Interactive courses with hands-on lessons
- Monaco Editor (VS Code's editor) for coding practice
- AI tutoring with Socratic teaching methods
- Competitive programming contests
- Real-time progress tracking
- Teacher dashboards for class management

# KEY FEATURES:

1. **Courses**: 
   - Browse 8+ courses (JavaScript, Python, DSA, React, TypeScript, etc.)
   - Each course has multiple interactive lessons
   - Progress tracking per student
   - Difficulty levels: Beginner, Intermediate, Advanced

2. **Code Editor**:
   - Monaco Editor integration (same as VS Code)
   - Supports JavaScript, Python, Java, C++
   - Run code instantly with output panel
   - Syntax highlighting and autocomplete
   - Dark/Light themes

3. **Practice Problems**:
   - 50+ coding problems across difficulties
   - Auto-grading with test cases
   - Submission history
   - Topic-wise categorization

4. **Contests**:
   - Live coding competitions
   - Real-time leaderboards
   - Time-bound challenges
   - Rankings and scores

5. **AI Features**:
   - Socratic tutor (guides with questions, doesn't give answers)
   - Error explanation
   - Code assistance
   - 10 queries per hour (demo version)

6. **Progress Tracking**:
   - Overall progress score
   - Streak counter
   - Weekly study time
   - Goals and milestones

# NAVIGATION:
- Home: / 
- Courses: /courses
- Course Detail: /courses/[slug]
- Lesson: /courses/[slug]/lessons/[id]
- Practice: /practice
- Contests: /contests

# USER ROLES:
- Students: Learn courses, solve problems, participate in contests
- Teachers: Create courses, monitor students, grade assignments
- Admins: Manage platform, users, and settings

# HOW TO HELP USERS:
- Explain features clearly and concisely
- Guide them to the right pages
- Help with navigation
- Answer questions about platform capabilities
- Encourage exploration and learning
- Be friendly and supportive

Remember: You're here to help users navigate and use the platform, NOT to teach coding (that's what our courses are for).
`;

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory, userEmail } = await req.json();

    const messages = [
      { role: "system" as const, content: APPLICATION_CONTEXT },
      ...(conversationHistory || []),
      { role: "user" as const, content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini",
      messages,
      max_completion_tokens: 600,
    });

    const reply = completion.choices[0].message.content;

    return NextResponse.json({ reply });

  } catch (error) {
    console.error("AI Assistant Error:", error);
    return NextResponse.json(
      { error: "Failed to get AI response" },
      { status: 500 }
    );
  }
}
