from fastapi import FastAPI

from .api.images import router as images_router
from .api.projects import router as projects_router
from .core.config import settings
from .api.image_search import router as image_search_router


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.debug,
)


app.include_router(projects_router)
app.include_router(images_router)
app.include_router(image_search_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
