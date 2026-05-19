"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, XCircle,
  User, Briefcase, GraduationCap, Wrench, FileText,
} from "lucide-react";
import { useResumeStore } from "@/store/resumeStore";
import { matchResume, extractResume, uploadResume } from "@/lib/api";
import clsx from "clsx";

export default function MatchPage() {
  const router = useRouter();
  const {
    resumeId, filename, extracted, matchResult,
    setMatchResult, setLoading, setError, setLastJobDescription,
    isMatching, error, lastJobDescription,
  } = useResumeStore();

  const [jd, setJd] = useState(lastJobDescription);

  const handleMatch = async () => {
    if (!resumeId || !jd.trim()) return;
    setLastJobDescription(jd);
    setLoading("matching", true);
    setError(null);
    try {
      const res = await matchResume(resumeId, jd);
      setMatchResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "匹配失败，请重试");
    } finally {
      setLoading("matching", false);
    }
  };

  const radarData = matchResult
    ? [
        { subject: "技能匹配", value: matchResult.score.skill_match },
        { subject: "经验相关", value: matchResult.score.experience_relevance },
        { subject: "学历匹配", value: matchResult.score.education_fit },
      ]
    : [];

  const scoreColor = (n: number) =>
    n >= 80 ? "text-green-600" : n >= 60 ? "text-amber-500" : "text-red-500";
  const scoreBg = (n: number) =>
    n >= 80 ? "bg-green-50 border-green-200" : n >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  if (!resumeId || !extracted) {
    return (
      <main className="min-h-screen bg-[#f8f7f4] flex items-center justify-center flex-col gap-4">
        <p className="text-gray-500">请先上传并解析简历</p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm hover:bg-gray-700 transition"
        >
          返回上传
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f7f4]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Nav */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          重新上传
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── 左列：简历信息 ── */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">简历解析结果</h2>

            {/* 基本信息 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-700">基本信息</span>
                <span className="ml-auto text-xs text-gray-400">{filename}</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["姓名", extracted.basic_info.name],
                  ["电话", extracted.basic_info.phone],
                  ["邮箱", extracted.basic_info.email],
                  ["地址", extracted.basic_info.address],
                  ["学历", extracted.education],
                  ["工作年限", extracted.work_years != null ? `${extracted.work_years} 年` : null],
                  ["求职意向", extracted.job_intention],
                  ["期望薪资", extracted.expected_salary],
                ].map(([label, val]) =>
                  val ? (
                    <div key={label as string}>
                      <dt className="text-gray-400">{label}</dt>
                      <dd className="text-gray-800 font-medium truncate">{val as string}</dd>
                    </div>
                  ) : null
                )}
              </dl>
            </div>

            {/* 技能 */}
            {extracted.skills.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-gray-700">技能标签</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extracted.skills.map((s) => (
                    <span key={s} className="px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-100">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 工作经历 */}
            {extracted.work_experiences.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-teal-500" />
                  <span className="font-medium text-gray-700">工作经历</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  {extracted.work_experiences.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-gray-300 shrink-0">·</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── 右列：JD + 评分 ── */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">岗位匹配评分</h2>

            {/* JD 输入 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                岗位需求描述（JD）
              </label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="粘贴岗位描述，例如：我们正在招聘一名后端工程师，要求 3 年以上 Python 经验，熟悉 FastAPI、Redis、MySQL，有阿里云部署经验优先…"
                rows={6}
                className="w-full text-sm text-gray-700 placeholder:text-gray-300 resize-none focus:outline-none"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleMatch}
                  disabled={isMatching || !jd.trim()}
                  className={clsx(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition",
                    isMatching || !jd.trim()
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-gray-700"
                  )}
                >
                  {isMatching ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />分析中…</>
                  ) : (
                    "开始匹配"
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* 评分结果 */}
            {matchResult && (
              <>
                {/* 总分 */}
                <div className={clsx("rounded-2xl p-5 border text-center", scoreBg(matchResult.score.total))}>
                  <p className="text-sm text-gray-500 mb-1">综合匹配分</p>
                  <p className={clsx("text-6xl font-bold", scoreColor(matchResult.score.total))}>
                    {matchResult.score.total}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">{matchResult.score.summary}</p>
                  {matchResult.cached && (
                    <span className="inline-block mt-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      来自缓存
                    </span>
                  )}
                </div>

                {/* 雷达图 */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-sm font-medium text-gray-700 mb-3">各维度得分</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <Radar
                        name="得分"
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-3 mt-2 text-center text-sm">
                    {[
                      ["技能匹配", matchResult.score.skill_match],
                      ["经验相关", matchResult.score.experience_relevance],
                      ["学历匹配", matchResult.score.education_fit],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <p className={clsx("text-xl font-bold", scoreColor(val as number))}>{val}</p>
                        <p className="text-gray-400 text-xs">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 关键词 */}
                <div className="grid grid-cols-2 gap-4">
                  {matchResult.matched_keywords.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-700">已具备</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {matchResult.matched_keywords.map((k) => (
                          <span key={k} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {matchResult.missing_keywords.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-3">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium text-gray-700">待补强</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {matchResult.missing_keywords.map((k) => (
                          <span key={k} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full border border-red-100">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
