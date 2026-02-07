"""
Generate a secure encryption key for AES-256-GCM encryption.

Usage:
    python generate_encryption_key.py

This will generate a base64-encoded 256-bit (32 byte) encryption key
and print instructions for adding it to your .env file.
"""
import os
import base64


def generate_encryption_key() -> str:
    """
    Generate a cryptographically secure 256-bit encryption key.
    
    Returns:
        Base64-encoded encryption key string
    """
    # Generate 32 random bytes (256 bits) using cryptographically secure RNG
    key_bytes = os.urandom(32)
    
    # Encode as base64 for storage in .env file
    key_base64 = base64.b64encode(key_bytes).decode('utf-8')
    
    return key_base64


def main():
    """Generate key and print instructions."""
    print("=" * 70)
    print("🔐 AES-256-GCM Encryption Key Generator")
    print("=" * 70)
    print()
    
    # Generate new key
    encryption_key = generate_encryption_key()
    
    print("✅ Encryption key generated successfully!")
    print()
    print("📋 Copy the following line to your backend/.env file:")
    print()
    print("-" * 70)
    print(f"ENCRYPTION_KEY={encryption_key}")
    print("-" * 70)
    print()
    print("⚠️  IMPORTANT SECURITY NOTES:")
    print()
    print("1. Keep this key SECRET - never commit it to Git")
    print("2. Store it securely (e.g., password manager, secrets vault)")
    print("3. If the key is lost, encrypted data CANNOT be recovered")
    print("4. Rotate the key periodically for better security")
    print("5. Use different keys for development and production")
    print()
    print("📝 Next steps:")
    print()
    print("1. Add the key to backend/.env:")
    print(f"   echo 'ENCRYPTION_KEY={encryption_key}' >> backend/.env")
    print()
    print("2. Verify .gitignore includes .env:")
    print("   grep -q '.env' .gitignore || echo '.env' >> .gitignore")
    print()
    print("3. Test encryption:")
    print("   python -c \"from utils.security_utils import get_encryptor; ")
    print("   e = get_encryptor(); print(e.decrypt(e.encrypt('test')))\"")
    print()
    print("=" * 70)


if __name__ == "__main__":
    main()
