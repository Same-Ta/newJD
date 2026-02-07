"""
Security utilities for data encryption and decryption.
Uses AES-256-GCM for secure data encryption.
"""
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag


class DataEncryption:
    """
    AES-256-GCM encryption and decryption for sensitive data.
    
    Usage:
        encryptor = DataEncryption()
        encrypted = encryptor.encrypt("sensitive data")
        decrypted = encryptor.decrypt(encrypted)
    """
    
    def __init__(self):
        """Initialize encryption with key from environment variables."""
        encryption_key = os.getenv("ENCRYPTION_KEY")
        
        if not encryption_key:
            raise ValueError(
                "ENCRYPTION_KEY not found in environment variables. "
                "Please run generate_encryption_key.py to create one."
            )
        
        try:
            # Decode base64 key to bytes
            key_bytes = base64.b64decode(encryption_key)
            
            if len(key_bytes) != 32:
                raise ValueError("Encryption key must be 32 bytes (256 bits)")
            
            self.aesgcm = AESGCM(key_bytes)
            
        except Exception as e:
            raise ValueError(f"Invalid ENCRYPTION_KEY format: {str(e)}")
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext string using AES-256-GCM.
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Base64-encoded string containing nonce + ciphertext
            
        Raises:
            ValueError: If encryption fails
        """
        try:
            # Convert string to bytes
            plaintext_bytes = plaintext.encode('utf-8')
            
            # Generate random 96-bit nonce (12 bytes recommended for GCM)
            nonce = os.urandom(12)
            
            # Encrypt data (GCM mode provides authentication)
            ciphertext = self.aesgcm.encrypt(nonce, plaintext_bytes, None)
            
            # Combine nonce + ciphertext and encode as base64
            encrypted_data = nonce + ciphertext
            encoded = base64.b64encode(encrypted_data).decode('utf-8')
            
            return encoded
            
        except Exception as e:
            raise ValueError(f"Encryption failed: {str(e)}")
    
    def decrypt(self, encrypted: str) -> str:
        """
        Decrypt AES-256-GCM encrypted string.
        
        Args:
            encrypted: Base64-encoded string from encrypt()
            
        Returns:
            Original plaintext string
            
        Raises:
            ValueError: If decryption fails (tampered data, wrong key, etc.)
        """
        try:
            # Decode base64
            encrypted_data = base64.b64decode(encrypted)
            
            # Extract nonce (first 12 bytes) and ciphertext
            nonce = encrypted_data[:12]
            ciphertext = encrypted_data[12:]
            
            # Decrypt and verify authentication tag
            plaintext_bytes = self.aesgcm.decrypt(nonce, ciphertext, None)
            
            # Convert bytes to string
            plaintext = plaintext_bytes.decode('utf-8')
            
            return plaintext
            
        except InvalidTag:
            raise ValueError(
                "Decryption failed: Data has been tampered with or wrong key"
            )
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")
    
    def encrypt_dict(self, data: dict, fields: list[str]) -> dict:
        """
        Encrypt specific fields in a dictionary.
        
        Args:
            data: Dictionary containing data
            fields: List of field names to encrypt
            
        Returns:
            New dictionary with specified fields encrypted
            
        Example:
            >>> encryptor = DataEncryption()
            >>> user = {"name": "John", "ssn": "123-45-6789", "email": "john@example.com"}
            >>> encrypted = encryptor.encrypt_dict(user, ["ssn"])
            >>> # Only 'ssn' field is encrypted
        """
        result = data.copy()
        
        for field in fields:
            if field in result and result[field] is not None:
                result[field] = self.encrypt(str(result[field]))
        
        return result
    
    def decrypt_dict(self, data: dict, fields: list[str]) -> dict:
        """
        Decrypt specific fields in a dictionary.
        
        Args:
            data: Dictionary containing encrypted data
            fields: List of field names to decrypt
            
        Returns:
            New dictionary with specified fields decrypted
        """
        result = data.copy()
        
        for field in fields:
            if field in result and result[field] is not None:
                try:
                    result[field] = self.decrypt(result[field])
                except ValueError:
                    # Field might not be encrypted, keep original value
                    pass
        
        return result


# Singleton instance for application-wide use
_encryption_instance = None


def get_encryptor() -> DataEncryption:
    """
    Get singleton instance of DataEncryption.
    
    Returns:
        DataEncryption instance
        
    Usage:
        from utils.security_utils import get_encryptor
        
        encryptor = get_encryptor()
        encrypted = encryptor.encrypt("sensitive data")
    """
    global _encryption_instance
    
    if _encryption_instance is None:
        _encryption_instance = DataEncryption()
    
    return _encryption_instance
