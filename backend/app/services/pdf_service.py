import re
import pdfplumber
from io import BytesIO
from typing import Tuple


def parse_pdf(file_bytes: bytes) -> Tuple[str, int]:
    """
        解析 PDF后返回 (清洗后文本, 页数)
    """
    text_pages = []
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            page_text = page.extract_text(x_tolerance=2, y_tolerance=2)
            if page_text:
                text_pages.append(page_text)

    raw_text = "\n\n".join(text_pages)
    cleaned = _clean_text(raw_text)
    return cleaned, page_count


def _clean_text(text: str) -> str:
    """
        文本清洗：
        1. 去除多余空白行（保留段落分隔）
        2. 去除乱码字符
        3. 合并被断行的单词（英文简历常见）
        4. 去除页眉页脚常见噪音
    """
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"([a-z])-\n([a-z])", r"\1\2", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    lines = text.split("\n")
    cleaned_lines = [
        line for line in lines
        if not re.fullmatch(r"[\s\-–—·•◦▪|/\\0-9]+", line.strip())
    ]

    return "\n".join(cleaned_lines).strip()
