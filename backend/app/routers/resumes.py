"""
简历上传与信息提取路由
POST /resumes/upload   - 上传 PDF
POST /resumes/{id}/extract  - 提取关键信息
GET  /resumes/{id}     - 查询详情
DELETE /resumes/{id}   - 删除
"""
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks

from app.config import settings
from app.schemas import UploadResponse, ExtractResponse, ResumeDetail
from app.services.pdf_service import parse_pdf
from app.services.llm_service import extract_resume_info
from app.services import cache_service as cache
import traceback

router = APIRouter(prefix="/resumes", tags=["resumes"])


# ── 上传 PDF ──────────────────────────────────────────────
@router.post("/upload", response_model=UploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    # 文件类型校验
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="仅支持 PDF 格式")

    content = await file.read()

    # 文件大小校验
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"文件不能超过 {settings.max_file_size_mb}MB",
        )

    # 解析 PDF
    try:
        text, page_count = parse_pdf(content)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF 解析失败: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="PDF 内容为空，请检查文件")

    # 生成唯一 ID，缓存原文
    resume_id = str(uuid.uuid4())
    await cache.cache_set(
        cache.resume_raw_key(resume_id),
        {"text": text},
    )
    await cache.cache_set(
        cache.resume_meta_key(resume_id),
        {"filename": file.filename, "page_count": page_count},
    )

    return UploadResponse(
        resume_id=resume_id,
        filename=file.filename,
        page_count=page_count,
        raw_text_preview=text[:200],
    )


@router.post("/{resume_id}/extract", response_model=ExtractResponse)
async def extract_info(resume_id: str):
    # 先查缓存
    cached = await cache.cache_get(cache.resume_extracted_key(resume_id))
    if cached:
        from app.schemas import ResumeExtracted
        return ExtractResponse(
            resume_id=resume_id,
            extracted=ResumeExtracted(**cached),
            cached=True,
        )

    # 取原文
    raw = await cache.cache_get(cache.resume_raw_key(resume_id))
    if not raw:
        raise HTTPException(status_code=404, detail="简历不存在或已过期，请重新上传")

    # 调用 LLM
    try:
        extracted = await extract_resume_info(raw["text"])
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"AI 服务异常: {str(e)}")

    # 写缓存
    await cache.cache_set(
        cache.resume_extracted_key(resume_id),
        extracted.model_dump(),
    )

    return ExtractResponse(resume_id=resume_id, extracted=extracted, cached=False)


@router.get("/{resume_id}", response_model=ResumeDetail)
async def get_resume(resume_id: str):
    meta = await cache.cache_get(cache.resume_meta_key(resume_id))
    if not meta:
        raise HTTPException(status_code=404, detail="简历不存在或已过期")

    extracted_raw = await cache.cache_get(cache.resume_extracted_key(resume_id))
    extracted = None
    if extracted_raw:
        from app.schemas import ResumeExtracted
        extracted = ResumeExtracted(**extracted_raw)

    return ResumeDetail(
        resume_id=resume_id,
        filename=meta["filename"],
        extracted=extracted,
    )


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str):
    deleted = await cache.cache_delete_prefix(f"resume:{resume_id}:")
    if deleted == 0:
        raise HTTPException(status_code=404, detail="简历不存在")
    return {"message": "已删除", "resume_id": resume_id}
