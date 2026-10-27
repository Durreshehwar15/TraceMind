
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="TraceMind API")

# Allow the React development server to communicate with Python.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BugRequest(BaseModel):
    code: str
    error: str


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "TraceMind API"
    }


@app.post("/analyze")
def analyze_bug(request: BugRequest):
    return {
        "message": "Bug report received successfully",
        "code_length": len(request.code),
        "error_received": request.error,
        "status": "Received — AI analysis not connected yet"
    }
