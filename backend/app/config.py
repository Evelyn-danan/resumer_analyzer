from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # LLM
    dashscope_api_key: str = ""
    openai_api_key: str = ""
    openai_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    llm_model: str = "qwen-plus"

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_ttl: int = 86400

    # OSS
    oss_access_key_id: str = ""
    oss_access_key_secret: str = ""
    oss_bucket_name: str = "resume-analyzer"
    oss_endpoint: str = "https://oss-cn-hangzhou.aliyuncs.com"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
    # App
    app_env: str = "development"
    max_file_size_mb: int = 10

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = False

settings = Settings()
