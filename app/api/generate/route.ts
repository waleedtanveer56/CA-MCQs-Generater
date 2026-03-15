import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

export const maxDuration = 300; // Allow up to 5 minutes for high load and 50 MCQs

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { level, subject, topic, difficulty, mode, count } = body;

    if (!level || !subject || !topic || !difficulty || !count) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const apiKey = process.env.Google_AI_API || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const generationPrompt = `You are an expert examiner for the ICAP (Institute of Chartered Accountants of Pakistan).
Generate ${count} MCQs strictly for the following ICAP syllabus:
Level: ${level}
Subject: ${subject}
Topic: ${topic}

CRITICAL RULES FOR SCOPE AND BOUNDARIES:
1. The questions MUST be strictly within the boundaries of the ICAP ${level} syllabus for ${subject}.
2. Do NOT include concepts, standards, or difficulty levels from higher or lower ICAP levels.
3. Ensure absolutely no out-of-syllabus concepts are tested.

General Rules:
4. Questions must be conceptual and tricky, matching the exact difficulty of the ${level} exams.
5. Include scenario-based questions where appropriate for the subject.
6. Avoid simple definition questions unless appropriate for the level.
7. Each question must have four options (A, B, C, D).
8. Only one option must be correct.
9. Requested Difficulty level: ${difficulty}.
10. Provide a detailed explanation for each question, explaining why the correct option is right and why others are wrong.`;

    let lastError = null;
    let generatedMCQs = null;

    // Retry logic: Try up to 3 times to handle transient API or parsing errors
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const generationResponse = await ai.models.generateContent({
          model,
          contents: generationPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mcqs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      question: { type: Type.STRING },
                      options: {
                        type: Type.OBJECT,
                        properties: {
                          A: { type: Type.STRING },
                          B: { type: Type.STRING },
                          C: { type: Type.STRING },
                          D: { type: Type.STRING },
                        },
                        required: ["A", "B", "C", "D"],
                      },
                      correctOption: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                    },
                    required: ["id", "question", "options", "correctOption", "explanation"],
                  },
                },
              },
              required: ["mcqs"],
            },
          },
        });

        let rawText = generationResponse.text || "{}";
        
        // Clean up potential markdown formatting that breaks JSON.parse
        rawText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        rawText = rawText.replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

        if (rawText.startsWith("<")) {
          throw new Error("The AI service is currently overloaded and returned an invalid HTML response. Please try again.");
        }

        generatedMCQs = JSON.parse(rawText);
        
        if (!generatedMCQs || !generatedMCQs.mcqs || !Array.isArray(generatedMCQs.mcqs)) {
          throw new Error("Invalid JSON structure returned by AI");
        }
        
        // Success! Break out of the retry loop
        break;
      } catch (e: any) {
        console.error(`Attempt ${attempt} failed:`, e.message);
        
        // If the error is an HTML parsing error (either from our JSON.parse or from the SDK's internal fetch)
        if (e.message && (e.message.includes("Unexpected token '<'") || e.message.includes("is not valid JSON"))) {
          lastError = new Error("The AI service is currently overloaded or returned an invalid response. Please try again in a few moments.");
        } else {
          lastError = e;
        }
        
        generatedMCQs = null; // Reset for next attempt
        
        // Wait a short time before retrying with exponential backoff and jitter
        if (attempt < 3) {
          const baseDelay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s
          const jitter = Math.random() * 1000; // 0-1s jitter
          await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
        }
      }
    }

    if (!generatedMCQs || !generatedMCQs.mcqs) {
      throw new Error(lastError?.message || "Failed to generate MCQs after multiple attempts");
    }

    return NextResponse.json({ mcqs: generatedMCQs.mcqs, expandedTopics: topic });
  } catch (error: any) {
    console.error("Error generating MCQs:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during generation" },
      { status: 500 }
    );
  }
}
