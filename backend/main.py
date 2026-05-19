"""
FastAPI 主入口
- CORS 配置
- 路由注册
- 健康检查
- 阿里云 FC Handler（Serverless 兼容）
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import resumes, match

app = FastAPI(
    title="AI 简历分析系统",
    description="基于 LangChain + 通义千问的智能简历解析与岗位匹配",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resumes.router, prefix="/api")
app.include_router(match.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env}


# FC 使用 Mangum 将 WSGI/ASGI 适配为 FC Event
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except ImportError:
    pass  # 本地开发不需要 Mangum


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
