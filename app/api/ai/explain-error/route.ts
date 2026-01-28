import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { code, error, language } = await req.json();

    const prompt = `You are a helpful coding tutor. A student wrote this ${language} code and got an error.

CODE:
\`\`\`${language}
${code}
\`\`\`

ERROR:
${error}

Explain the error in simple terms (2-3 sentences) and give ONE specific hint to fix it (don't give the complete solution). Be encouraging!`;

    const completion = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 300,
    });

    return NextResponse.json({
      explanation: completion.choices[0].message.content,
    });

  } catch (error) {
    console.error("Error explanation failed:", error);
    return NextResponse.json(
      { error: "Failed to explain error" },
      { status: 500 }
    );
  }
}
