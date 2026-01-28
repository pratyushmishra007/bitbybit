import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; problemId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contestId, problemId } = await params;
    const body = await request.json();
    const { code, language } = body;

    // Get user
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user?.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is participant
    const { data: participant } = await supabase
      .from("contest_participants")
      .select("*")
      .eq("contest_id", contestId)
      .eq("user_id", user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    // Get problem details
    const { data: problem } = await supabase
      .from("contest_problems")
      .select("*")
      .eq("id", problemId)
      .single();

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    // Execute code against test cases
    const testCases = problem.test_cases || [];
    let allPassed = true;
    let score = 0;

    // Extract function name from code
    const getFunctionCall = (code: string, input: string): string => {
      const functionMatch = code.match(/function\s+(\w+)/);
      if (!functionMatch) return input;
      const functionName = functionMatch[1];
      return `${functionName}(${input})`;
    };

    for (const testCase of testCases) {
      try {
        // Wrap code with function call
        const wrappedCode = `${code}\n\n// Test execution\nconsole.log(${getFunctionCall(code, testCase.input)});`;

        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: language,
            version: "*",
            files: [{ content: wrappedCode }],
          }),
        });

        const result = await response.json();
        const output = result.run?.output?.trim() || "";
        const expected = testCase.expectedOutput?.trim() || "";

        if (output !== expected) {
          allPassed = false;
          break;
        }
      } catch (error) {
        allPassed = false;
        break;
      }
    }

    const status = allPassed ? "accepted" : "wrong_answer";
    if (allPassed) {
      score = problem.points;
    }

    // Save submission
    const { data: submission, error: submissionError } = await supabase
      .from("contest_submissions")
      .insert({
        contest_id: contestId,
        problem_id: problemId,
        user_id: user.id,
        code,
        language,
        status,
        score,
      })
      .select()
      .single();

    if (submissionError) throw submissionError;

    // Update participant score if accepted
    if (allPassed) {
      // Check if this is first successful submission for this problem
      const { data: previousSubmissions } = await supabase
        .from("contest_submissions")
        .select("status")
        .eq("contest_id", contestId)
        .eq("problem_id", problemId)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .neq("id", submission.id);

      // Only add score if this is first accepted submission
      if (!previousSubmissions || previousSubmissions.length === 0) {
        await supabase
          .from("contest_participants")
          .update({
            total_score: participant.total_score + score,
            problems_solved: participant.problems_solved + 1,
          })
          .eq("id", participant.id);
      }
    }

    return NextResponse.json({
      success: true,
      submission,
      allPassed,
      score,
    });
  } catch (error: any) {
    console.error("Error submitting solution:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit solution" },
      { status: 500 }
    );
  }
}
