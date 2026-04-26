import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class CryptographyProvider:
    def __init__(self):
        self.key = os.getenv("ENCRYPTION_KEY").encode()
        if len(self.key) != 32:
            raise ValueError("Chave de encriptacao deve ter 32 bytes")
        self.aesgcm = AESGCM(self.key)

    def encrypt(self, plaintext: str) -> tuple[bytes, bytes]:
        iv = os.urandom(12)
        ciphertext = self.aesgcm.encrypt(iv, plaintext.encode(), None)
        return iv, ciphertext

    def decrypt(self, iv: bytes, ciphertext: bytes) -> str:
        decrypted_data = self.aesgcm.decrypt(iv, ciphertext, None)
        return decrypted_data.decode()

crypto_provider = CryptographyProvider()