import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sqlite3

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
from backend.sync.sync_engine import (
    sync_logs,
    purge_synced_logs
)



from pydantic import BaseModel
from backend.services.session_service import (
    session_service
)
from backend.services.liveness_service import (
    liveness_service
)
import base64
import cv2
import numpy as np

from backend.services.face_service import (
    face_service
)
from backend.database.auth_logs import log_authentication

DB_NAME = "face_auth.db"


class RegistrationRequest(BaseModel):

    user_id: str

    name: str

class RegisterStartRequest(BaseModel):

    user_id: str
    name: str


class AuthStartRequest(BaseModel):

    device_id: str | None = None

class RegisterFrameRequest(BaseModel):
    session_id: str
    image: str

class AuthFrameRequest(BaseModel):
    session_id: str
    image: str

def decode_base64_image(image_data: str):

    if "," in image_data:
        image_data = image_data.split(",")[1]

    image_bytes = base64.b64decode(image_data)

    np_arr = np.frombuffer(
        image_bytes,
        np.uint8
    )

    return cv2.imdecode(
        np_arr,
        cv2.IMREAD_COLOR
    )


app = FastAPI(
    title="Offline Face Authentication API",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount(
    "/frontend",
    StaticFiles(directory=str(FRONTEND_DIR)),
    name="frontend"
)
@app.get("/")
def home():
    return FileResponse(str(FRONTEND_DIR / "index.html"))

@app.get("/register-page")
def register_page():
    return FileResponse(str(FRONTEND_DIR / "register.html"))

@app.get("/authenticate-page")
def auth_page():
    return FileResponse(str(FRONTEND_DIR / "authenticate.html"))

@app.get("/dashboard-page")
def dashboard_page():
    return FileResponse(str(FRONTEND_DIR / "dashboard.html"))

@app.get("/logs-page")
def logs_page():
    return FileResponse(str(FRONTEND_DIR / "logs.html"))

@app.get("/sync-page")
def sync_page():
    return FileResponse(str(FRONTEND_DIR / "sync.html"))

@app.get("/ui")
def dashboard_ui():

    return FileResponse(
        str(BASE_DIR / "backend" / "dashboard" / "index.html")
    )



@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "offline-face-auth"
    }

@app.get("/stats")
def stats():

    conn = sqlite3.connect(DB_NAME)

    total_users = conn.execute(
        "SELECT COUNT(*) FROM users"
    ).fetchone()[0]

    total_auth = conn.execute(
        "SELECT COUNT(*) FROM auth_logs"
    ).fetchone()[0]

    conn.close()

    return {
        "total_users": total_users,
        "total_authentications": total_auth
    }

@app.get("/users")
def users():

    conn = sqlite3.connect(DB_NAME)

    rows = conn.execute("""
    SELECT
        user_id,
        name,
        authentication_count,
        last_authenticated
    FROM users
    """).fetchall()

    conn.close()

    users = []

    for row in rows:

        users.append({
            "user_id": row[0],
            "name": row[1],
            "authentication_count": row[2],
            "last_authenticated": row[3]
        })

    return users

@app.get("/logs")
def logs():

    conn = sqlite3.connect(DB_NAME)

    rows = conn.execute("""
    SELECT
        id,
        user_id,
        confidence,
        timestamp
    FROM auth_logs
    ORDER BY id DESC
    LIMIT 50
    """).fetchall()

    conn.close()

    logs = []

    for row in rows:

        logs.append({
            "id": row[0],
            "user_id": row[1],
            "confidence": row[2],
            "timestamp": row[3]
        })

    return logs

@app.get("/system-info")
def system_info():

    return {
        "model": "ArcFace",
        "liveness": "Multi-Step Head Pose",
        "database": "SQLite",
        "encryption": "Fernet AES",
        "offline": True
    }


@app.get("/dashboard")
def dashboard():

    print(
        os.path.abspath(DB_NAME)
    )
    conn = sqlite3.connect(DB_NAME)

    total_users = conn.execute(
        "SELECT COUNT(*) FROM users"
    ).fetchone()[0]

    total_auth = conn.execute(
        "SELECT COUNT(*) FROM auth_logs"
    ).fetchone()[0]

    pending_sync = conn.execute(
        """
        SELECT COUNT(*)
        FROM auth_logs
        WHERE sync_status='PENDING'
        """
    ).fetchone()[0]

    synced_records = conn.execute(
        """
        SELECT COUNT(*)
        FROM auth_logs
        WHERE sync_status='SYNCED'
        """
    ).fetchone()[0]

    conn.close()

    return {
        "total_users": total_users,
        "total_authentications": total_auth,
        "pending_sync": pending_sync,
        "synced_records": synced_records
    }

@app.get("/system-status")
def system_status():

    return {
        "system_status": "ONLINE",
        "encryption": "ENABLED",
        "liveness": "MULTI-STEP",
        "network_mode": "OFFLINE",
        "model": "ArcFace",
        "database": "SQLite"
    }



@app.get("/logs-api")
def logs_api():

    conn = sqlite3.connect(DB_NAME)

    rows = conn.execute("""
    SELECT
        id,
        user_id,
        confidence,
        timestamp,
        sync_status
    FROM auth_logs
    ORDER BY id DESC
    """).fetchall()

    conn.close()

    logs = []

    for row in rows:

        logs.append({
            "id": row[0],
            "user_id": row[1],
            "confidence": row[2],
            "timestamp": row[3],
            "sync_status": row[4]
        })

    return logs

@app.post("/sync")
def sync():

    count = sync_logs()

    return {
        "status": "success",
        "synced_records": count
    }

@app.post("/purge")
def purge():

    count = purge_synced_logs()

    return {
        "status": "success",
        "purged_records": count
    }

@app.get("/sync-stats")
def sync_stats():

    conn = sqlite3.connect(DB_NAME)

    pending = conn.execute("""
    SELECT COUNT(*)
    FROM auth_logs
    WHERE sync_status='PENDING'
    """).fetchone()[0]

    synced = conn.execute("""
    SELECT COUNT(*)
    FROM auth_logs
    WHERE sync_status='SYNCED'
    """).fetchone()[0]

    conn.close()

    return {
        "pending": pending,
        "synced": synced
    }


@app.get("/users-page")
def users_page():

    return FileResponse(
        str(FRONTEND_DIR / "users.html")
    )


@app.get("/system-page")
def system_page():

    return FileResponse(
        str(FRONTEND_DIR / "system.html")
    )


@app.get("/export-auth-records")
def export_auth_records():

    conn = sqlite3.connect(DB_NAME)

    conn.row_factory = sqlite3.Row

    records = conn.execute("""
        SELECT
            id,
            user_id,
            confidence,
            timestamp,
            sync_status
        FROM auth_logs
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    return [
        dict(record)
        for record in records
    ]

@app.get("/datalake-page")
def datalake_page():

    return FileResponse(
        str(FRONTEND_DIR / "datalake.html")
    )

@app.post("/api/register/start")
def api_register_start(
    req: RegisterStartRequest
):

    session_id = (
        session_service.create_session(
            "registration"
        )
    )

    session_service.update_session(
        session_id,
        {
            "user_id": req.user_id,
            "name": req.name
        }
    )

    return {
        "status": "success",
        "session_id": session_id,
        "message":
        "Registration session created"
    }

@app.post("/api/auth/start")
def api_auth_start():

    session_id = (
        session_service.create_session(
            "authentication"
        )
    )

    challenge_sequence = (
        liveness_service
        .create_challenge_sequence()
    )

    session_service.update_session(
        session_id,
        {
            "challenge_sequence":
            challenge_sequence,

            "challenge_index": 0,

            "verified": False
        }
    )

    return {
        "status": "success",
        "session_id": session_id,
        "challenge":
        challenge_sequence[0]
    }

@app.post("/api/auth/frame")
def api_auth_frame(req: AuthFrameRequest):
    session = session_service.get_session(req.session_id)
    if not session:
        return {"status": "error", "message": "Invalid session"}

    try:
        frame = decode_base64_image(req.image)
    except Exception as e:
        return {"status": "error", "message": f"Invalid image data: {str(e)}"}

    faces = face_service.detect_faces(frame)
    if len(faces) == 0:
        return {"status": "pending", "message": "No face detected"}
    if len(faces) > 1:
        return {"status": "failed", "message": "Multiple faces detected - Auth Blocked"}

    face = faces[0]
    
    # --- NHAI INNOVATION: ZERO-BYTE LIVENESS ---
    # Because we aggressively compressed the AI model to ~16MB (buffalo_sc), 
    # the heavy 3D pose estimator is excluded. We dynamically calculate the yaw
    # using 2D geometric landmark tracking (kps) instead.
    try:
        if face.pose is not None:
            yaw = float(face.pose[1])
        else:
            # kps[0] = Left Eye, kps[1] = Right Eye, kps[2] = Nose
            left_eye_x = face.kps[0][0]
            right_eye_x = face.kps[1][0]
            nose_x = face.kps[2][0]
            
            eye_dist = right_eye_x - left_eye_x
            if eye_dist == 0: 
                eye_dist = 0.1 # Prevent division by zero
                
            ratio = (nose_x - left_eye_x) / eye_dist
            
            # Map ratio to approximate degrees (-50 to +50)
            # Center is ~0.5. Looking left/right shifts the nose ratio.
            yaw = (ratio - 0.5) * 100
    except Exception as e:
        yaw = 0.0
    data = session["data"]

    # --- LIVENESS PHASE ---
    if not data.get("verified", False):
        challenges = data["challenge_sequence"]
        idx = data["challenge_index"]
        current_challenge = challenges[idx]

        passed = liveness_service.verify(current_challenge, yaw)
        
        if passed:
            idx += 1
            if idx >= len(challenges):
                session_service.update_session(req.session_id, {
                    "verified": True,
                    "verified_embedding": face.embedding,
                    "challenge_index": idx
                })
                return {"status": "liveness_passed", "message": "Liveness Verified. Authenticating..."}
            else:
                session_service.update_session(req.session_id, {"challenge_index": idx})
                return {"status": "challenge_passed", "message": f"Passed! Next: {challenges[idx]}", "next_challenge": challenges[idx]}
        
        return {"status": "pending", "message": f"Challenge: Turn {current_challenge}"}

    # --- AUTHENTICATION PHASE ---
    else:
        drift_score = face_service.cosine_similarity(data["verified_embedding"], face.embedding)
        if drift_score < 0.75:
            session_service.delete_session(req.session_id)
            return {"status": "failed", "message": "Identity changed during authentication"}

        result = face_service.match_user(face.embedding)
        
        if result.get("authenticated"):
            log_authentication(result["user_id"], result["confidence"])
            session_service.delete_session(req.session_id)
            return {
                "status": "success", 
                "message": "Authentication Complete", 
                "user": result
            }
        else:
            session_service.delete_session(req.session_id)
            return {"status": "failed", "message": "Unknown User / Not Recognized"}

@app.post("/api/register/frame")
def api_register_frame(
    req: RegisterFrameRequest
):

    session = session_service.get_session(
        req.session_id
    )

    if not session:

        return {
            "status": "error",
            "message": "Invalid session"
        }

    try:

        frame = decode_base64_image(
            req.image
        )

    except Exception as e:

        return {
            "status": "error",
            "message":
            f"Invalid image data: {str(e)}"
        }

    faces = face_service.detect_faces(
        frame
    )

    if len(faces) == 0:

        return {
            "status": "failed",
            "face_detected": False
        }

    if len(faces) > 1:

        return {
            "status": "failed",
            "message": "Multiple faces detected"
        }

    embedding = faces[0].embedding

    session_service.update_session(
        req.session_id,
        {
            "embedding": embedding
        }
    )

    return {
        "status": "success",
        "face_detected": True
    }

@app.post("/api/register/complete")
def api_register_complete(
    session_id: str
):

    session = session_service.get_session(
        session_id
    )

    if not session:

        return {
            "status": "error"
        }

    data = session["data"]

    if "embedding" not in data:

        return {
            "status": "error",
            "message":
            "No face captured"
        }

    face_service.save_user(
        data["user_id"],
        data["name"],
        data["embedding"]
    )

    session_service.delete_session(
        session_id
    )

    return {
        "status": "success",
        "message":
        "User registered successfully"
    }

