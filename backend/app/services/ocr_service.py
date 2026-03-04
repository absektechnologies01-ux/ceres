import httpx
from app.config import settings


async def extract_ocr(image_url: str) -> dict:
    """
    Calls the Chandra OCR API with the image URL.
    Returns { text, metadata }.
    """
    payload = {
        "image_url": image_url,
        "api_key": settings.CHANDRA_OCR_API_KEY,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(settings.CHANDRA_OCR_API_URL, json=payload)
        response.raise_for_status()
        data = response.json()
    return {
        "text": data.get("text", ""),
        "metadata": data.get("metadata", {}),
    }
