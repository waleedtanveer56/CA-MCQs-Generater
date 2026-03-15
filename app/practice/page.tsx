"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { jsPDF } from "jspdf";
import {
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Download,
  RefreshCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  Brain,
  Clock,
  Home,
} from "lucide-react";

export default function PracticePage() {
  const router = useRouter();
  const { mcqs, settings, clearState } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [showExplanations, setShowExplanations] = useState<Record<string, boolean>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(
    settings.timeLimit ? settings.timeLimit * 60 : null
  );

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => (prev ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Speech synthesis cleanup
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleNavigation = (newIndex: number) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentIndex(newIndex);
  };

  // Redirect if no MCQs
  useEffect(() => {
    if (mcqs.length === 0) {
      router.push("/generator");
    }
  }, [mcqs, router]);

  if (mcqs.length === 0) return null;

  const currentMCQ = mcqs[currentIndex];
  const isAnswered = !!selectedOptions[currentMCQ.id];
  const showAnswer = showAnswers[currentMCQ.id];
  const showExplanation = showExplanations[currentMCQ.id];

  const handleOptionSelect = (optionKey: string) => {
    if (isAnswered) return;
    setSelectedOptions((prev) => ({ ...prev, [currentMCQ.id]: optionKey }));
  };

  const toggleShowAnswer = () => {
    setShowAnswers((prev) => ({ ...prev, [currentMCQ.id]: true }));
  };

  const toggleExplanation = () => {
    setShowExplanations((prev) => ({ ...prev, [currentMCQ.id]: !prev[currentMCQ.id] }));
  };

  const handleListen = () => {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in your browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    
    let text = `Question: ${currentMCQ.question}. Options: A, ${currentMCQ.options.A}. B, ${currentMCQ.options.B}. C, ${currentMCQ.options.C}. D, ${currentMCQ.options.D}.`;
    
    if (showExplanation) {
      text += ` Explanation: ${currentMCQ.explanation}`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;

    doc.setFontSize(16);
    doc.text(`ICAP Practice: ${settings.subject}`, 20, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Topic: ${settings.topic} | Difficulty: ${settings.difficulty}`, 20, y);
    y += 15;

    mcqs.forEach((mcq, index) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const qLines = doc.splitTextToSize(`Q${index + 1}: ${mcq.question}`, 170);
      doc.text(qLines, 20, y);
      y += qLines.length * 7;

      doc.setFont("helvetica", "normal");
      const options = [
        `A) ${mcq.options.A}`,
        `B) ${mcq.options.B}`,
        `C) ${mcq.options.C}`,
        `D) ${mcq.options.D}`,
      ];

      options.forEach((opt) => {
        const optLines = doc.splitTextToSize(opt, 160);
        doc.text(optLines, 30, y);
        y += optLines.length * 6;
      });

      y += 5;
      doc.setFont("helvetica", "italic");
      doc.text(`Correct Answer: ${mcq.correctOption}`, 20, y);
      y += 10;

      if (mcq.explanation) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const expLines = doc.splitTextToSize(`Explanation: ${mcq.explanation}`, 160);
        doc.text(expLines, 20, y);
        y += expLines.length * 5 + 5;
      }
    });

    doc.save(`ICAP_Practice_${settings.topic.replace(/[^a-z0-9]/gi, "_")}.pdf`);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-gray-700 pb-40 relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-white/[0.03] to-transparent blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              onClick={() => clearState()}
              className="text-gray-400 hover:text-white transition-colors"
              title="Back to Home"
            >
              <Home className="w-5 h-5" />
            </Link>
            <button
              onClick={() => {
                clearState();
                router.push("/generator");
              }}
              className="text-gray-400 hover:text-white transition-colors"
              title="Generator Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="hidden md:block">
              <h2 className="text-sm font-semibold text-white truncate max-w-[200px]">
                {settings.subject}
              </h2>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{settings.topic}</p>
            </div>
          </div>

          {timeLeft !== null && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 px-3 sm:px-4 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300" />
              <span className={`font-mono text-xs sm:text-sm ${timeLeft < 60 ? "text-red-400" : "text-white"}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          <div className="text-sm font-medium text-gray-400">
            {currentIndex + 1} / {mcqs.length}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-[#111] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl"
          >
            {/* Question */}
            <h3 className="text-xl sm:text-2xl font-medium text-white mb-8 leading-relaxed">
              {currentMCQ.question}
            </h3>

            {/* Options */}
            <div className="space-y-4 mb-8">
              {(["A", "B", "C", "D"] as const).map((key) => {
                const isSelected = selectedOptions[currentMCQ.id] === key;
                const isCorrect = currentMCQ.correctOption === key;
                const showStatus = showAnswer || isAnswered;

                let buttonClass =
                  "w-full text-left px-6 py-4 rounded-xl border transition-all flex items-center justify-between group ";

                if (showStatus) {
                  if (isCorrect) {
                    buttonClass += "bg-emerald-900/20 border-emerald-500/50 text-emerald-100";
                  } else if (isSelected && !isCorrect) {
                    buttonClass += "bg-red-900/20 border-red-500/50 text-red-100";
                  } else {
                    buttonClass += "bg-black border-white/5 text-gray-500 opacity-50";
                  }
                } else {
                  buttonClass += isSelected
                    ? "bg-white/10 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                    : "bg-black border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/5";
                }

                return (
                  <button
                    key={key}
                    onClick={() => handleOptionSelect(key)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-mono text-sm font-bold">
                        {key}
                      </span>
                      <span className="text-sm sm:text-base">{currentMCQ.options[key]}</span>
                    </div>
                    {showStatus && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {showStatus && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/10">
              {!showAnswer && (
                <button
                  onClick={toggleShowAnswer}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Show Answer
                </button>
              )}
              <button
                onClick={toggleExplanation}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Explain
              </button>
              <button
                onClick={handleListen}
                className={`px-4 py-2 hover:bg-white/20 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isSpeaking ? "bg-white/20 text-emerald-400" : "bg-white/10 text-white"}`}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isSpeaking ? "Stop" : "Listen"}
              </button>
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 overflow-hidden"
                >
                  <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                      AI Explanation
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {currentMCQ.explanation}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between mt-8 mb-12">
          <button
            onClick={() => handleNavigation(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>
          <button
            onClick={() => handleNavigation(Math.min(mcqs.length - 1, currentIndex + 1))}
            disabled={currentIndex === mcqs.length - 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/80 backdrop-blur-xl p-4 sm:p-6 z-50">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => {
                clearState();
                router.push("/generator");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-full transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Generate More
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-gray-200 text-sm font-bold rounded-full transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
          <div className="text-xs text-gray-500 font-medium text-center sm:text-right">
            Built by Waleed Tanveer
          </div>
        </div>
      </div>
    </div>
  );
}
