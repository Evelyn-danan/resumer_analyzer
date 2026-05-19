from pydantic import BaseModel, EmailStr
from typing import Optional, List



class BasicInfo(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class ResumeExtracted(BaseModel):
    basic_info: BasicInfo = BasicInfo()
    job_intention: Optional[str] = None       # 求职意向
    expected_salary: Optional[str] = None     # 期望薪资
    work_years: Optional[int] = None          # 工作年限
    education: Optional[str] = None           # 最高学历
    skills: List[str] = []                    # 技能列表
    project_experiences: List[str] = []       # 项目经历摘要
    work_experiences: List[str] = []          # 工作经历摘要



class MatchScore(BaseModel):
    total: int                    # 总分 0-100
    skill_match: int              # 技能匹配度
    experience_relevance: int     # 经验相关性
    education_fit: int            # 学历匹配度
    summary: str                  # AI 评语



class UploadResponse(BaseModel):
    resume_id: str
    filename: str
    page_count: int
    raw_text_preview: str         # 前 200 字预览


class ExtractResponse(BaseModel):
    resume_id: str
    extracted: ResumeExtracted
    cached: bool = False


class MatchRequest(BaseModel):
    resume_id: str
    job_description: str          # 岗位 JD 文本


class MatchResponse(BaseModel):
    resume_id: str
    extracted: ResumeExtracted
    score: MatchScore
    matched_keywords: List[str]
    missing_keywords: List[str]
    cached: bool = False


class ResumeDetail(BaseModel):
    resume_id: str
    filename: str
    extracted: Optional[ResumeExtracted] = None
    last_match: Optional[MatchResponse] = None
