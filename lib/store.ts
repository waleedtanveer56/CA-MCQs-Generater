import { create } from "zustand";

export interface MCQ {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
}

interface AppState {
  mcqs: MCQ[];
  setMCQs: (mcqs: MCQ[]) => void;
  settings: {
    level: string;
    subject: string;
    topic: string;
    difficulty: string;
    mode: string;
    count: number;
    timeLimit?: number; // in minutes
  };
  setSettings: (settings: Partial<AppState["settings"]>) => void;
  clearState: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  mcqs: [],
  setMCQs: (mcqs) => set({ mcqs }),
  settings: {
    level: "",
    subject: "",
    topic: "",
    difficulty: "Exam Level",
    mode: "Normal",
    count: 20,
  },
  setSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  clearState: () =>
    set({
      mcqs: [],
      settings: {
        level: "",
        subject: "",
        topic: "",
        difficulty: "Exam Level",
        mode: "Normal",
        count: 20,
      },
    }),
}));
