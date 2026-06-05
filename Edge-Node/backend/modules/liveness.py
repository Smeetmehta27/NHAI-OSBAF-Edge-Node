LEFT_THRESHOLD = 25
RIGHT_THRESHOLD = -25

CENTER_MIN = -15
CENTER_MAX = 15

def verify_left(yaw):
    return yaw > LEFT_THRESHOLD

def verify_right(yaw):
    return yaw < RIGHT_THRESHOLD

def verify_center(yaw):
    return CENTER_MIN <= yaw <= CENTER_MAX