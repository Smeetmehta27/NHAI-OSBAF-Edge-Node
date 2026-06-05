import random
from backend.modules.liveness import verify_left, verify_right, verify_center

class LivenessService:
    def create_challenge_sequence(self):
        # Randomize the first two directions to prevent pattern prediction
        directions = ["LEFT", "RIGHT"]
        random.shuffle(directions)
        
        # Always end on CENTER. This forces the user to look directly at the lens 
        # precisely when the final embedding is captured, maximizing accuracy.
        sequence = [directions[0], directions[1], "CENTER"]
        return sequence

    def verify(self, challenge, yaw):
        if challenge == "LEFT":
            return verify_left(yaw)
        if challenge == "RIGHT":
            return verify_right(yaw)
        if challenge == "CENTER":
            return verify_center(yaw)
        return False

liveness_service = LivenessService()