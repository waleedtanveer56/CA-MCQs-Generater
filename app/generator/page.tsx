"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { syllabus, ExamLevel } from "@/lib/syllabus";
import { useAppStore } from "@/lib/store";
import { Loader2, ArrowRight, BrainCircuit, Home } from "lucide-react";

export default function GeneratorPage() {
  const router = useRouter();
  const { setMCQs, setSettings } = useAppStore();

  const [level, setLevel] = useState<ExamLevel | "">("");
  const [subject, setSubject] = useState("");
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Exam Level");
  const [practiceMode, setPracticeMode] = useState("Normal Practice");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Update subjects based on level
  const subjects = useMemo(() => (level ? syllabus[level] : []), [level]);

  // Handle topic suggestions
  useEffect(() => {
    if (!topic || isRandomMode || !subject) {
      setTopicSuggestions([]);
      return;
    }
    const currentSubject = subjects.find((s) => s.name === subject);
    if (currentSubject) {
      const filtered = currentSubject.topics.filter((t) =>
        t.toLowerCase().includes(topic.toLowerCase())
      );
      setTopicSuggestions(filtered);
    }
  }, [topic, subject, subjects, isRandomMode]);

  const [loadingStep, setLoadingStep] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!level || !subject || (!isRandomMode && !topic)) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    setLoadingStep("Analyzing syllabus and topic...");

    let finalTopic = topic;
    if (isRandomMode) {
      const currentSubject = subjects.find((s) => s.name === subject);
      if (currentSubject) {
        finalTopic = currentSubject.topics.join(", ");
      }
    }

    let count = 20;
    let timeLimit = undefined;

    if (practiceMode === "10 questions - 10 minutes") {
      count = 10;
      timeLimit = 10;
    } else if (practiceMode === "20 questions - 25 minutes") {
      count = 20;
      timeLimit = 25;
    } else if (practiceMode === "50 questions - 60 minutes") {
      count = 50;
      timeLimit = 60;
    }

    try {
      setLoadingStep(`Generating ${count} ${difficulty} MCQs...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          subject,
          topic: finalTopic,
          difficulty,
          mode: practiceMode,
          count,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      setLoadingStep("Validating questions and explanations...");
      
      let data;
      const responseText = await res.text();
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response:", responseText);
        throw new Error("The server encountered an unexpected error or timed out. Please try generating again.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate MCQs");
      }

      setLoadingStep("Preparing your practice session...");
      setMCQs(data.mcqs);
      setSettings({
        level,
        subject,
        topic: finalTopic,
        difficulty,
        mode: practiceMode,
        count,
        timeLimit,
      });

      router.push("/practice");
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("The request took too long. The server might be experiencing high traffic. Please try again.");
      } else {
        setError(err.message);
      }
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-white/[0.04] to-transparent blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="mb-6 flex justify-start">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
        <div className="mb-8 text-center">
          <BrainCircuit className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Practice Generator</h1>
          <p className="text-gray-400 mt-2">Configure your AI-powered practice session</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <form onSubmit={handleGenerate} className="space-y-8">
            {/* Exam Level */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Exam Level</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["PRC", "CAF", "CFAP", "MSA"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setLevel(l as ExamLevel);
                      setSubject("");
                      setTopic("");
                    }}
                    className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                      level === l
                        ? "bg-white text-black border-white"
                        : "bg-black border-white/10 text-gray-400 hover:border-white/30"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            {level && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subjects.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        setSubject(s.name);
                        setTopic("");
                      }}
                      className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all text-left flex items-center min-h-[3.5rem] break-words whitespace-normal ${
                        subject === s.name
                          ? "bg-white text-black border-white"
                          : "bg-black border-white/10 text-gray-400 hover:border-white/30"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Topic Selection */}
            {subject && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-300">Topic Selection</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500">Random Mode</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isRandomMode}
                        onChange={() => {
                          setIsRandomMode(!isRandomMode);
                          setTopic("");
                        }}
                      />
                      <div className={`block w-11 h-6 rounded-full transition-colors ${isRandomMode ? 'bg-white' : 'bg-gray-800'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-black w-4 h-4 rounded-full transition-transform ${isRandomMode ? 'transform translate-x-5' : ''}`}></div>
                    </div>
                  </label>
                </div>

                {!isRandomMode && (
                  <div className="relative">
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => {
                        setTopic(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Type any topic or chapter (e.g., Inventory Valuation)"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none"
                    />
                    {showSuggestions && topicSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-y-auto max-h-60">
                        {topicSuggestions.map((s) => (
                          <div
                            key={s}
                            className="px-4 py-3 text-sm text-gray-300 hover:bg-white/10 cursor-pointer transition-colors break-words"
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent input blur
                              setTopic(s);
                              setShowSuggestions(false);
                            }}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty Level</label>
              <div className="grid grid-cols-2 gap-3">
                {["Basic", "Exam Level", "Past Paper Level", "Extreme Conceptual"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                      difficulty === d
                        ? "bg-white text-black border-white"
                        : "bg-black border-white/10 text-gray-400 hover:border-white/30"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Practice Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Practice Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "Normal Practice",
                  "10 questions - 10 minutes",
                  "20 questions - 25 minutes",
                  "50 questions - 60 minutes",
                ].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPracticeMode(m)}
                    className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                      practiceMode === m
                        ? "bg-white text-black border-white"
                        : "bg-black border-white/10 text-gray-400 hover:border-white/30"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="w-full flex flex-col items-center justify-center gap-4 py-8 px-6 bg-[#1a1a1a] border border-white/10 rounded-xl">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-1">Generating Practice Session</h3>
                  <p className="text-sm text-gray-400 animate-pulse">{loadingStep}</p>
                </div>
                <div className="w-full max-w-xs bg-black rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-white h-1.5 rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '50%' }}></div>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!level || !subject || (!isRandomMode && !topic)}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Questions
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </form>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/10 py-8 text-center text-gray-500 text-sm relative z-10">
        <p>Powered by Advanced AI. Not affiliated with ICAP.</p>
        <p className="mt-2 text-gray-400 font-medium">Built by Waleed Tanveer</p>
      </footer>
    </div>
  );
}
