import axios from "axios";
import { useResumeStore } from "@/store/resumeStore";

// 动态取 store 中的 baseUrl，支持运行时切换
const getBaseUrl = () =>
  useResumeStore.getState().apiBaseUrl ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";

// ── 上传 PDF ──────────────────────────────────────────────
export async function uploadResume(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axios.post(`${getBaseUrl()}/resumes/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // UploadResponse
}

// ── 提取关键信息 ──────────────────────────────────────────
export async function extractResume(resumeId: string) {
  const { data } = await axios.post(
    `${getBaseUrl()}/resumes/${resumeId}/extract`
  );
  return data; // ExtractResponse
}

// ── 岗位匹配评分 ──────────────────────────────────────────
export async function matchResume(resumeId: string, jobDescription: string) {
  const { data } = await axios.post(`${getBaseUrl()}/match`, {
    resume_id: resumeId,
    job_description: jobDescription,
  });
  return data; // MatchResponse
}

// ── 查询详情 ──────────────────────────────────────────────
export async function getResume(resumeId: string) {
  const { data } = await axios.get(`${getBaseUrl()}/resumes/${resumeId}`);
  return data;
}
