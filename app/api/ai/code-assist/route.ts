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

export async function POST(req: NextRequest) {
  try {
    const { code, language, cursor, type } = await req.json();

    // Type can be: "complete", "explain", "debug", "optimize"
    
    if (type === "complete") {
      // Code completion
      const beforeCursor = code.substring(0, cursor);
      const afterCursor = code.substring(cursor);

      const prompt = `You are a code completion assistant for ${language}.

Current code:
\`\`\`${language}
${beforeCursor}█${afterCursor}
\`\`\`

The cursor is at █. Suggest the next 1-3 tokens to complete the code.
Return ONLY the completion text, no explanations.`;

      const completion = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 100,
      });

      return NextResponse.json({
        completion: completion.choices[0].message.content?.trim() || "",
      });
    }

    if (type === "explain") {
      // Explain selected code
      const prompt = `Explain this ${language} code in 2-3 sentences for a beginner:

\`\`\`${language}
${code}
\`\`\`

Be clear and concise.`;

      const completion = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 200,
      });

      return NextResponse.json({
        explanation: completion.choices[0].message.content,
      });
    }

    if (type === "debug") {
      // Debug code
      const prompt = `Analyze this ${language} code for potential bugs or issues:

\`\`\`${language}
${code}
\`\`\`

List 1-3 potential issues in bullet points. Be specific.`;

      const completion = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 250,
      });

      return NextResponse.json({
        suggestions: completion.choices[0].message.content,
      });
    }

    if (type === "optimize") {
      // Optimize code
      const prompt = `Suggest optimizations for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Give 2-3 specific optimization suggestions with brief explanations.`;

      const completion = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 300,
      });

      return NextResponse.json({
        optimizations: completion.choices[0].message.content,
      });
    }

    if (type === "generate") {
      // Generate code based on selection or context
      const prompt = code
        ? `Complete or extend this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Generate the next logical code that fits the context. Return ONLY the generated code, no explanations.`
        : `Generate a complete ${language} function or code block.

Return ONLY the generated code, no markdown or explanations.`;

      const completion = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 500,
      });

      return NextResponse.json({
        generated: completion.choices[0].message.content?.trim() || "",
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  } catch (error) {
    console.error("Code Assist Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
