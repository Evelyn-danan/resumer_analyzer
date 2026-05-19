"""
Redis 缓存服务
- 缓存 Key 设计：
    resume:{id}:raw        → 原始文本
    resume:{id}:meta       → 文件名、页数等元数据
    resume:{id}:extracted  → LLM 提取结果
    resume:{id}:match:{hash(jd)} → 匹配评分结果
"""
import json
import hashlib
from typing import Optional

import redis.asyncio as aioredis

from app.config import settings


_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def cache_set(key: str, value: dict, ttl: int = None) -> None:
    r = await get_redis()
    await r.setex(
        key,
        ttl or settings.redis_ttl,
        json.dumps(value, ensure_ascii=False),
    )


async def cache_get(key: str) -> Optional[dict]:
    r = await get_redis()
    raw = await r.get(key)
    if raw:
        return json.loads(raw)
    return None


async def cache_delete_prefix(prefix: str) -> int:
    """删除某个 resume 的所有缓存"""
    r = await get_redis()
    keys = await r.keys(f"{prefix}*")
    if keys:
        return await r.delete(*keys)
    return 0


def resume_raw_key(resume_id: str) -> str:
    return f"resume:{resume_id}:raw"

def resume_meta_key(resume_id: str) -> str:
    return f"resume:{resume_id}:meta"

def resume_extracted_key(resume_id: str) -> str:
    return f"resume:{resume_id}:extracted"

def resume_match_key(resume_id: str, job_description: str) -> str:
    jd_hash = hashlib.md5(job_description.encode()).hexdigest()[:12]
    return f"resume:{resume_id}:match:{jd_hash}"
