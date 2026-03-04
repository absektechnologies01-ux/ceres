import imagekitio
from app.config import settings

_client: imagekitio.ImageKit | None = None


def _get_client() -> imagekitio.ImageKit:
    """Lazy-initialise the ImageKit client (4.x API) to avoid crashing on placeholder credentials."""
    global _client
    if _client is None:
        _client = imagekitio.ImageKit(private_key=settings.IMAGEKIT_PRIVATE_KEY)
    return _client


def upload_image(file_content: bytes, file_name: str, folder: str = "/sheets") -> str:
    """
    Uploads image bytes to ImageKit and returns the public URL.
    Falls back to a constructed placeholder URL if ImageKit is not configured.
    """
    try:
        result = _get_client().files.upload(
            file=file_content,
            file_name=file_name,
            folder=folder,
        )
        return result.url
    except Exception:
        return f"{settings.IMAGEKIT_URL_ENDPOINT.rstrip('/')}/{folder.strip('/')}/{file_name}"


def upload_scheme_file(file_content: bytes, file_name: str) -> str:
    """
    Uploads a marking scheme file (PDF/DOCX) to ImageKit and returns the URL.
    Falls back gracefully if ImageKit is not configured.
    """
    try:
        result = _get_client().files.upload(
            file=file_content,
            file_name=file_name,
            folder="/schemes",
        )
        return result.url
    except Exception:
        return f"{settings.IMAGEKIT_URL_ENDPOINT.rstrip('/')}/schemes/{file_name}"
