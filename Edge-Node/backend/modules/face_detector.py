import cv2
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = str(BASE_DIR / "models" / "face_detection_yunet_2023mar.onnx")

def get_yunet_detector():
    return cv2.FaceDetectorYN.create(MODEL_PATH, "", (320, 320), score_threshold=0.8)

# CRITICAL: This block prevents the camera from opening when imported by main.py
if __name__ == "__main__":
    print("YuNet Test Mode...")
    detector = get_yunet_detector()
    cap = cv2.VideoCapture(0)
    while True:
        ret, frame = cap.read()
        if not ret: break
        cv2.imshow("Test Window", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"): break
    cap.release()
    cv2.destroyAllWindows()