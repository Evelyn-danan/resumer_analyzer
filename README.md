# AI 智能简历分析系统

基于 **LangChain + 通义千问** 的简历解析与岗位匹配系统。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | FastAPI + LangChain + pdfplumber |
| LLM | 通义千问（dashscope，阿里云原生）|
| 缓存 | Redis（阿里云 Tair）|
| 前端 | Next.js 14 + Zustand + Recharts + Tailwind |
| 部署 | 后端 → 阿里云函数计算 FC；前端 → GitHub Pages |

## 快速启动

### 后端

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# 填写 DASHSCOPE_API_KEY 和 REDIS_URL

uvicorn main:app --reload
# 访问 http://localhost:8000/docs
```

### 前端

```bash
cd frontend
npm install

# 修改 .env.local 中的 NEXT_PUBLIC_API_URL
npm run dev
# 访问 http://localhost:3000
```

## 目录结构

```
resume-analyzer/
├── backend/
│   ├── main.py                  # FastAPI 入口 + FC Handler
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── config.py            # 环境配置
│       ├── schemas.py           # Pydantic 数据模型
│       ├── services/
│       │   ├── pdf_service.py   # PDF 解析 + 清洗
│       │   ├── llm_service.py   # LangChain + 通义千问
│       │   └── cache_service.py # Redis 缓存
│       └── routers/
│           ├── resumes.py       # 上传 / 提取 / 查询
│           └── match.py         # 岗位匹配评分
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx         # 上传页
    │   │   └── match/page.tsx   # 匹配评分页
    │   ├── store/resumeStore.ts # Zustand 状态管理
    │   └── lib/api.ts           # API 封装
    ├── next.config.js
    └── package.json
```

## API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/resumes/upload | 上传 PDF |
| POST | /api/resumes/{id}/extract | AI 提取关键信息 |
| POST | /api/match | 岗位匹配评分 |
| GET | /api/resumes/{id} | 查询缓存结果 |
| DELETE | /api/resumes/{id} | 删除记录 |

## 阿里云 FC 部署

1. 安装 `fun` 或 `s` CLI
2. `pip install mangum` 加入 requirements.txt
3. 配置 `s.yaml` 指向 `main.handler`
4. `s deploy`

## GitHub Pages 部署

1. 在仓库 Settings → Pages 选择 GitHub Actions
2. 在 Secrets 中添加 `API_URL`（你的 FC 公网地址）
3. 推送到 `main` 分支自动触发
