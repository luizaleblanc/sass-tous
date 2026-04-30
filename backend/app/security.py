import base64
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

    def encrypt_str(self, plaintext: str) -> str:
        """Encrypt and return a single storable string: base64(iv):base64(ciphertext)."""
        iv, ciphertext = self.encrypt(plaintext)
        return base64.b64encode(iv).decode() + ":" + base64.b64encode(ciphertext).decode()

    def decrypt_str(self, stored: str) -> str:
        """Decrypt a value produced by encrypt_str."""
        iv_b64, ct_b64 = stored.split(":", 1)
        return self.decrypt(base64.b64decode(iv_b64), base64.b64decode(ct_b64))


crypto_provider = CryptographyProvider()