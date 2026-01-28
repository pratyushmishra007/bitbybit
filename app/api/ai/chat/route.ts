import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";

// Rate limiting store (in production, use Redis)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

// Lazy initialization of Azure OpenAI client
function getOpenAIClient() {
  if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
    throw new Error("Missing Azure OpenAI credentials. Please set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables.");
  }
  
  return new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory, codeContext, userEmail } = await req.json();
    
    // Get OpenAI client (lazy initialization)
    const openai = getOpenAIClient();

    // Rate limiting (10 queries per hour per user)
    const now = Date.now();
    const userLimit = rateLimits.get(userEmail) || { count: 0, resetAt: now + 3600000 };
    
    if (now > userLimit.resetAt) {
      userLimit.count = 0;
      userLimit.resetAt = now + 3600000;
    }

    if (userLimit.count >= 10) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in " + Math.ceil((userLimit.resetAt - now) / 60000) + " minutes" },
        { status: 429 }
      );
    }

    // Socratic tutor system prompt
    const systemPrompt = `You are a Socratic coding tutor for BitByBit, an educational platform.

CORE PRINCIPLES:
1. NEVER give direct answers or complete code solutions
2. Ask guiding questions that lead students to discover answers themselves
3. Break complex problems into smaller, manageable steps
4. Give tiny hints through questions if student is stuck
5. Celebrate when they figure things out
6. Be encouraging and patient

APPROACH:
- When student asks "why doesn't this work?", ask what they expect vs what happens
- When student asks "how do I...?", ask what they've tried and guide their thinking
- When student is completely stuck, give a small hint, then ask what they think next
- Use analogies and real-world examples
- Encourage experimentation: "What happens if you try...?"

TONE: Friendly, encouraging, curious (like a patient mentor)

${codeContext ? `\n\nCURRENT CODE CONTEXT:\n${codeContext}` : ""}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user" as const, content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini",
      messages,
      max_completion_tokens: 500,
    });

    const reply = completion.choices[0].message.content;

    // Update rate limit
    userLimit.count++;
    rateLimits.set(userEmail, userLimit);

    return NextResponse.json({
      reply,
      remainingQueries: 10 - userLimit.count,
      resetIn: Math.ceil((userLimit.resetAt - now) / 60000),
    });

  } catch (error) {
    console.error("AI Chat Error:", error);
    return NextResponse.json(
      { error: "Failed to get AI response" },
      { status: 500 }
    );
  }
}
