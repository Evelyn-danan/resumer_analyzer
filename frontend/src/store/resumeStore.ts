import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── 类型定义 ──────────────────────────────────────────────
export interface BasicInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface ResumeExtracted {
  basic_info: BasicInfo;
  job_intention?: string;
  expected_salary?: string;
  work_years?: number;
  education?: string;
  skills: string[];
  project_experiences: string[];
  work_experiences: string[];
}

export interface MatchScore {
  total: number;
  skill_match: number;
  experience_relevance: number;
  education_fit: number;
  summary: string;
}

export interface MatchResult {
  resume_id: string;
  extracted: ResumeExtracted;
  score: MatchScore;
  matched_keywords: string[];
  missing_keywords: string[];
  cached: boolean;
}

// ── Store ─────────────────────────────────────────────────
interface ResumeStore {
  // 当前简历
  resumeId: string | null;
  filename: string | null;
  pageCount: number;
  extracted: ResumeExtracted | null;
  matchResult: MatchResult | null;

  // UI 状态（不持久化）
  isUploading: boolean;
  isExtracting: boolean;
  isMatching: boolean;
  error: string | null;

  // 持久化偏好
  lastJobDescription: string;     // 上次输入的 JD
  apiBaseUrl: string;             // 后端地址（方便切换环境）

  // Actions
  setResumeId: (id: string, filename: string, pageCount: number) => void;
  setExtracted: (data: ResumeExtracted) => void;
  setMatchResult: (data: MatchResult) => void;
  setLoading: (key: "uploading" | "extracting" | "matching", val: boolean) => void;
  setError: (msg: string | null) => void;
  setLastJobDescription: (jd: string) => void;
  setApiBaseUrl: (url: string) => void;
  reset: () => void;
}

export const useResumeStore = create<ResumeStore>()(
  persist(
    (set) => ({
      // 初始状态
      resumeId: null,
      filename: null,
      pageCount: 0,
      extracted: null,
      matchResult: null,
      isUploading: false,
      isExtracting: false,
      isMatching: false,
      error: null,
      lastJobDescription: "",
      apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",

      setResumeId: (id, filename, pageCount) =>
        set({ resumeId: id, filename, pageCount, extracted: null, matchResult: null }),

      setExtracted: (data) => set({ extracted: data }),

      setMatchResult: (data) => set({ matchResult: data }),

      setLoading: (key, val) =>
        set({
          isUploading: key === "uploading" ? val : false,
          isExtracting: key === "extracting" ? val : false,
          isMatching: key === "matching" ? val : false,
        }),

      setError: (msg) => set({ error: msg }),

      setLastJobDescription: (jd) => set({ lastJobDescription: jd }),

      setApiBaseUrl: (url) => set({ apiBaseUrl: url }),

      reset: () =>
        set({
          resumeId: null,
          filename: null,
          pageCount: 0,
          extracted: null,
          matchResult: null,
          error: null,
        }),
    }),
    {
      name: "resume-analyzer-store",
      // 只持久化轻量偏好，不持久化简历数据（敏感 + 体积大）
      partialize: (state) => ({
        lastJobDescription: state.lastJobDescription,
        apiBaseUrl: state.apiBaseUrl,
      }),
    }
  )
);
