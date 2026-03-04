from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    IMAGEKIT_PUBLIC_KEY: str
    IMAGEKIT_PRIVATE_KEY: str
    IMAGEKIT_URL_ENDPOINT: str
    CHANDRA_OCR_API_URL: str
    CHANDRA_OCR_API_KEY: str
    STUDENT_ID_CONFIDENCE_THRESHOLD: float = 0.55

    class Config:
        env_file = ".env"


settings = Settings()
