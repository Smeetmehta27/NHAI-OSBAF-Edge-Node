import sqlite3
import pickle
import numpy as np

from insightface.app import FaceAnalysis

from backend.utils.encryption import (
    encrypt_data,
    decrypt_data
)

DB_NAME = "face_auth.db"

THRESHOLD = 0.75


class FaceService:

    def __init__(self):
        # Force lightweight model (buffalo_sc is ~16MB) to meet NHAI constraints
        self.app = FaceAnalysis(
            name="buffalo_sc",
            providers=["CPUExecutionProvider"]
        )
        # Set a fixed det_size to improve processing speed (< 1 sec constraint)
        self.app.prepare(ctx_id=0, det_size=(320, 320))

    # -------------------------
    # FACE DETECTION
    # -------------------------

    def detect_faces(self, frame):

        return self.app.get(frame)

    # -------------------------
    # EMBEDDING EXTRACTION
    # -------------------------

    def extract_embedding(self, frame):

        faces = self.detect_faces(frame)

        if len(faces) == 0:
            return None

        return faces[0].embedding

    # -------------------------
    # COSINE SIMILARITY
    # -------------------------

    def cosine_similarity(
        self,
        emb1,
        emb2
    ):

        return np.dot(
            emb1,
            emb2
        ) / (
            np.linalg.norm(emb1)
            * np.linalg.norm(emb2)
        )

    # -------------------------
    # SAVE USER
    # -------------------------

    def save_user(
        self,
        user_id,
        name,
        embedding
    ):

        conn = sqlite3.connect(DB_NAME)

        conn.execute(
            """
            INSERT OR REPLACE INTO users
            (
                user_id,
                name,
                embedding
            )
            VALUES (?, ?, ?)
            """,
            (
                user_id,
                name,
                encrypt_data(
                    pickle.dumps(
                        embedding
                    )
                )
            )
        )

        conn.commit()
        conn.close()

    # -------------------------
    # LOAD USERS
    # -------------------------

    def load_users(self):

        conn = sqlite3.connect(DB_NAME)

        rows = conn.execute(
            """
            SELECT
                user_id,
                name,
                embedding
            FROM users
            """
        ).fetchall()

        conn.close()

        users = []

        for row in rows:

            users.append({
                "user_id": row[0],
                "name": row[1],
                "embedding": pickle.loads(
                    decrypt_data(
                        row[2]
                    )
                )
            })

        return users

    # -------------------------
    # MATCH USER
    # -------------------------

    def match_user(
        self,
        embedding
    ):

        users = self.load_users()

        best_user = None
        best_score = 0

        for user in users:

            score = self.cosine_similarity(
                embedding,
                user["embedding"]
            )

            if score > best_score:

                best_score = score
                best_user = user

        if (
            best_user is not None
            and best_score >= THRESHOLD
        ):

            return {
                "authenticated": True,
                "user_id": best_user["user_id"],
                "name": best_user["name"],
                "confidence": round(
                    float(best_score),
                    4
                )
            }

        return {
            "authenticated": False
        }


face_service = FaceService()