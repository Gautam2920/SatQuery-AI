from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.analysis import router as analysis_router
from .api.auth import router as auth_router
from .api.images import router as images_router
from .api.projects import router as projects_router
from .core.config import settings
from .api.image_search import router as image_search_router


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.debug,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(images_router)
app.include_router(image_search_router)
app.include_router(analysis_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
