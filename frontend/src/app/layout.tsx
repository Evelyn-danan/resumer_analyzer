import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 简历分析系统",
  description: "基于 LangChain + 通义千问的智能简历解析与岗位匹配",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-blue-100">
        {children}
      </body>
    </html>
  );
}
