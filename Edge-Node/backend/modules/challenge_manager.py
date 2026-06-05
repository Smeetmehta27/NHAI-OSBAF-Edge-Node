import random

CHALLENGES = [
    "LEFT",
    "RIGHT"
]

def generate_challenge():
    return random.choice(CHALLENGES)