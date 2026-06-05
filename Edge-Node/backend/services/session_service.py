import uuid
from datetime import datetime


class SessionService:

    def __init__(self):

        self.sessions = {}

    def create_session(
        self,
        session_type
    ):

        session_id = str(
            uuid.uuid4()
        )

        self.sessions[session_id] = {
            "type": session_type,
            "created_at": datetime.utcnow(),
            "data": {}
        }

        return session_id

    def get_session(
        self,
        session_id
    ):

        return self.sessions.get(
            session_id
        )

    def update_session(
        self,
        session_id,
        data
    ):

        if session_id in self.sessions:

            self.sessions[
                session_id
            ]["data"].update(data)

    def delete_session(
        self,
        session_id
    ):

        if session_id in self.sessions:

            del self.sessions[
                session_id
            ]


session_service = SessionService()