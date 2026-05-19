"""
LLM 服务：使用 LangChain + 通义千问
- 关键信息提取
- 岗位匹配评分
"""
import json
import re
from typing import Tuple, List

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from langchain_core.messages import HumanMessage, SystemMessage

from app.config import settings
from app.schemas import ResumeExtracted, MatchScore, BasicInfo


def _get_llm() -> ChatOpenAI:
    """初始化 LLM"""
    print(settings.dashscope_api_key)
    print(settings.llm_model)
    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.dashscope_api_key or settings.openai_api_key,
        base_url=settings.openai_base_url,
        temperature=0.1,        # 信息提取任务用低温度保证稳定性
        max_tokens=2048,
    )
    

# 提取关键信息
EXTRACT_SYSTEM = """你是一个专业的简历解析助手。
请从简历文本中提取结构化信息，严格按照 JSON 格式返回，不要输出任何额外内容。
如果某字段在简历中未提及，对应值设为 null 或空列表。"""

EXTRACT_HUMAN = """请解析以下简历，提取关键信息，返回如下 JSON 格式：
{{
  "basic_info": {{
    "name": "姓名",
    "phone": "手机号",
    "email": "邮箱",
    "address": "地址"
  }},
  "job_intention": "求职意向",
  "expected_salary": "期望薪资",
  "work_years": 工作年限数字(整数),
  "education": "最高学历(本科/硕士/博士/专科等)",
  "skills": ["技能1", "技能2"],
  "project_experiences": ["项目1简介", "项目2简介"],
  "work_experiences": ["公司1职位经历简介", "公司2职位经历简介"]
}}

简历内容：
---
{resume_text}
---"""


async def extract_resume_info(resume_text: str) -> ResumeExtracted:
    """调用 LLM 提取简历关键信息"""
    llm = _get_llm()

    prompt = ChatPromptTemplate.from_messages([
        ("system", EXTRACT_SYSTEM),
        ("human", EXTRACT_HUMAN),
    ])

    chain = prompt | llm
    result = await chain.ainvoke({"resume_text": resume_text[:6000]})  # 截断防超限

    raw = result.content.strip()
    data = _parse_json_safe(raw)

    # 构建 Pydantic 模型（容错解析）
    basic = data.get("basic_info", {})
    return ResumeExtracted(
        basic_info=BasicInfo(
            name=basic.get("name"),
            phone=basic.get("phone"),
            email=basic.get("email"),
            address=basic.get("address"),
        ),
        job_intention=data.get("job_intention"),
        expected_salary=data.get("expected_salary"),
        work_years=_to_int(data.get("work_years")),
        education=data.get("education"),
        skills=data.get("skills") or [],
        project_experiences=data.get("project_experiences") or [],
        work_experiences=data.get("work_experiences") or [],
    )


# 岗位匹配评分
MATCH_SYSTEM = """你是一个资深招聘顾问，擅长评估简历与岗位的匹配度。
请严格按照 JSON 格式返回评估结果，不要输出任何额外内容。
评分标准：0-100分，60分及格，80分优秀，90分以上极优。"""

MATCH_HUMAN = """请评估以下简历与岗位需求的匹配度：

【岗位需求】
{job_description}

【候选人简历摘要】
姓名：{name}
技能：{skills}
工作年限：{work_years}年
学历：{education}
工作经历：{work_experiences}
项目经历：{project_experiences}

请返回如下 JSON：
{{
  "total": 总分(0-100),
  "skill_match": 技能匹配度(0-100),
  "experience_relevance": 经验相关性(0-100),
  "education_fit": 学历匹配度(0-100),
  "summary": "2-3句综合评语",
  "matched_keywords": ["岗位要求中简历已具备的关键词"],
  "missing_keywords": ["岗位要求中简历缺失的关键词"]
}}"""


async def match_resume_to_job(
    extracted: ResumeExtracted,
    job_description: str,
) -> Tuple[MatchScore, List[str], List[str]]:
    """调用 LLM 进行岗位匹配评分"""
    llm = _get_llm()

    prompt = ChatPromptTemplate.from_messages([
        ("system", MATCH_SYSTEM),
        ("human", MATCH_HUMAN),
    ])

    chain = prompt | llm
    result = await chain.ainvoke({
        "job_description": job_description[:3000],
        "name": extracted.basic_info.name or "未知",
        "skills": ", ".join(extracted.skills) if extracted.skills else "未提及",
        "work_years": extracted.work_years or 0,
        "education": extracted.education or "未知",
        "work_experiences": "\n".join(extracted.work_experiences[:3]),
        "project_experiences": "\n".join(extracted.project_experiences[:3]),
    })

    raw = result.content.strip()
    data = _parse_json_safe(raw)

    score = MatchScore(
        total=_clamp(data.get("total", 50)),
        skill_match=_clamp(data.get("skill_match", 50)),
        experience_relevance=_clamp(data.get("experience_relevance", 50)),
        education_fit=_clamp(data.get("education_fit", 50)),
        summary=data.get("summary", ""),
    )
    matched = data.get("matched_keywords") or []
    missing = data.get("missing_keywords") or []

    return score, matched, missing


# 工具函数
def _parse_json_safe(text: str) -> dict:
    """容错 JSON 解析，自动去除 markdown 代码块"""
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        # 尝试提取第一个 {...} 块
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
    return {}


def _to_int(val) -> int | None:
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def _clamp(val, lo=0, hi=100) -> int:
    try:
        return max(lo, min(hi, int(val)))
    except (TypeError, ValueError):
        return lo
