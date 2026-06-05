from cryptography.fernet import Fernet

KEY = b"xsIDkyEUALIzvAaw6FgnZ9555z6hc9pHU9HRBucu9o0="

cipher = Fernet(KEY)

def encrypt_data(data: bytes):
    return cipher.encrypt(data)

def decrypt_data(data: bytes):
    return cipher.decrypt(data)