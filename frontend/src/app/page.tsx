"use client";

import { useCallback, useState, useRef } from "react"; // 1. 引入 useRef
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X, Plus } from "lucide-react";
import { useResumeStore } from "@/store/resumeStore";
import { uploadResume, extractResume } from "@/lib/api";
import clsx from "clsx";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null); // 2. 创建 Ref
  const { setResumeId, setExtracted, setLoading, setError, error, isUploading, isExtracting } =
    useResumeStore();
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [step, setStep] = useState<"idle" | "uploaded" | "extracting" | "done">("idle");

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("仅支持 PDF 格式");
      return;
    }
    setError(null);
    setUploadedFile(file);

    setLoading("uploading", true);
    try {
      const uploadRes = await uploadResume(file);
      setResumeId(uploadRes.resume_id, uploadRes.filename, uploadRes.page_count);
      setStep("uploaded");

      setLoading("extracting", true);
      setStep("extracting");
      const extractRes = await extractResume(uploadRes.resume_id);
      setExtracted(extractRes.extracted);
      setStep("done");

      setTimeout(() => router.push("/match"), 800);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "操作失败，请重试";
      setError(msg);
      setStep("idle");
    } finally {
      setLoading("uploading", false);
      setLoading("extracting", false);
    }
  }, [router, setResumeId, setExtracted, setLoading, setError]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // 3. 按钮点击触发函数
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const isLoading = isUploading || isExtracting;

  return (
    <main className="min-h-screen bg-blue-50 flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="w-full mb-12 flex flex-col items-center justify-center">
        <h1 className="w-full text-center text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
          AI 赋能的智能简历分析系统
        </h1>
        <div className="w-full max-w-4xl overflow-hidden rounded-t-3xl border-x border-t border-slate-200 bg-white shadow-sm">
          <div className="py-5 px-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <p className="text-gray-500 text-base md:text-lg font-medium text-center flex items-center justify-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              上传简历 PDF，AI 自动解析并与岗位需求精准匹配
            </p>
          </div>
        </div>

      </div>

      <div className="w-full max-w-xl">
        {/* 4. 修改 label 为 div，移除自动关联点击 */}
        <div
          onDragOver={(e) => { e.preventDefault(); !isLoading && setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={clsx(
            "flex flex-col items-center justify-center gap-4 w-full h-72 rounded-3xl border-2 border-dashed transition-all duration-300 relative overflow-hidden",
            dragOver
              ? "border-blue-500 bg-blue-50/50 scale-[1.02] shadow-xl shadow-blue-100"
              : "border-slate-200 bg-white shadow-sm",
            isLoading && "opacity-70 cursor-not-allowed"
          )}
        >
          <input
            ref={fileInputRef} // 5. 绑定 Ref
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            disabled={isLoading}
          />

          {step === "idle" && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-2">
                <Upload className="w-7 h-7 text-slate-400" />
              </div>
              <div className="text-center px-10">
                <p className="text-slate-400 text-sm mb-4">拖拽 PDF 简历文件至此处</p>
                
                {/* 6. 只有点击这个按钮才会触发上传 */}
                <button
                  onClick={triggerFileInput}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-200 disabled:bg-slate-300"
                >
                  <Plus className="w-4 h-4" />
                  选择简历文件
                </button>
              </div>
              <p className="text-[10px] text-slate-300 absolute bottom-6 uppercase tracking-widest font-bold">
                Max file size: 10MB • Format: PDF
              </p>
            </>
          )}

          {(step === "uploaded" || step === "extracting") && (
            <div className="flex flex-col items-center">
              <div className="relative">
                 <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                 </div>
              </div>
              <div className="text-center mt-6">
                <p className="text-blue-600 font-bold text-lg">
                  {step === "uploaded" ? "正在读取文件..." : "AI 正在提取数据..."}
                </p>
                <div className="mt-2 px-3 py-1 bg-slate-100 rounded-lg inline-flex items-center gap-2">
                   <FileText className="w-3 h-3 text-slate-400" />
                   <span className="text-xs text-slate-500 truncate max-w-[200px]">{uploadedFile?.name}</span>
                </div>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <p className="text-emerald-600 font-bold text-xl tracking-tight">分析已就绪</p>
              <p className="text-slate-400 text-sm mt-1">即将为您呈现匹配结果</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-3 px-5 py-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-sm shadow-sm animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Steps Guide */}
        <div className="mt-12 flex items-center justify-between px-10">
          {[
            { label: "上传简历", icon: <FileText className="w-4 h-4" /> },
            { label: "AI 提取", icon: <Loader2 className="w-4 h-4" /> },
            { label: "精准匹配", icon: <CheckCircle className="w-4 h-4" /> },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm text-slate-400">
                {s.icon}
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}