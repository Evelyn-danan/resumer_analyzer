"""
岗位匹配评分路由
POST /match  - 提交 JD，对指定简历评分
"""
from fastapi import APIRouter, HTTPException

from app.schemas import MatchRequest, MatchResponse, ResumeExtracted
from app.services.llm_service import match_resume_to_job
from app.services import cache_service as cache

router = APIRouter(prefix="/match", tags=["match"])


@router.post("", response_model=MatchResponse)
async def match_resume(req: MatchRequest):
    if not req.job_description.strip():
        raise HTTPException(status_code=400, detail="岗位描述不能为空")

    # 查匹配缓存
    match_key = cache.resume_match_key(req.resume_id, req.job_description)
    cached = await cache.cache_get(match_key)
    if cached:
        return MatchResponse(**cached, cached=True)

    # 取提取结果（必须先提取过）
    extracted_raw = await cache.cache_get(cache.resume_extracted_key(req.resume_id))
    if not extracted_raw:
        raise HTTPException(
            status_code=404,
            detail="未找到简历提取信息，请先调用 /resumes/{id}/extract",
        )

    extracted = ResumeExtracted(**extracted_raw)

    # 调用 LLM 评分
    try:
        score, matched_kw, missing_kw = await match_resume_to_job(
            extracted, req.job_description
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 评分服务异常: {str(e)}")

    result = MatchResponse(
        resume_id=req.resume_id,
        extracted=extracted,
        score=score,
        matched_keywords=matched_kw,
        missing_keywords=missing_kw,
        cached=False,
    )

    # 写缓存
    await cache.cache_set(match_key, result.model_dump())

    return result
