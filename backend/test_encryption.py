"""Test the encryption functionality."""
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

from utils.security_utils import get_encryptor

def test_encryption():
    """Test basic encryption and decryption."""
    print("=" * 70)
    print("🔐 Testing AES-256-GCM Encryption")
    print("=" * 70)
    print()
    
    # Get encryptor instance
    try:
        encryptor = get_encryptor()
        print("✅ Encryption module loaded successfully")
    except ValueError as e:
        print(f"❌ Failed to load encryption module: {e}")
        return
    
    print()
    
    # Test 1: Basic string encryption
    test_data = "민감한 개인정보 테스트 - 주민번호: 123456-1234567"
    print(f"📝 Original data: {test_data}")
    print()
    
    encrypted = encryptor.encrypt(test_data)
    print(f"🔒 Encrypted data: {encrypted[:60]}...")
    print()
    
    decrypted = encryptor.decrypt(encrypted)
    print(f"🔓 Decrypted data: {decrypted}")
    print()
    
    if decrypted == test_data:
        print("✅ Test 1 PASSED: Basic encryption/decryption works!")
    else:
        print("❌ Test 1 FAILED: Decrypted data doesn't match original")
    
    print()
    print("-" * 70)
    print()
    
    # Test 2: Dictionary field encryption
    user_data = {
        "name": "홍길동",
        "email": "hong@example.com",
        "ssn": "123456-1234567",
        "phone": "010-1234-5678",
        "address": "서울시 강남구 테헤란로 123"
    }
    
    print("📝 Original user data:")
    for key, value in user_data.items():
        print(f"   {key}: {value}")
    print()
    
    # Encrypt sensitive fields only
    sensitive_fields = ["ssn", "phone", "address"]
    encrypted_data = encryptor.encrypt_dict(user_data, sensitive_fields)
    
    print(f"🔒 Encrypted user data (ssn, phone, address encrypted):")
    for key, value in encrypted_data.items():
        if key in sensitive_fields:
            print(f"   {key}: {value[:40]}...")
        else:
            print(f"   {key}: {value}")
    print()
    
    # Decrypt sensitive fields
    decrypted_data = encryptor.decrypt_dict(encrypted_data, sensitive_fields)
    
    print(f"🔓 Decrypted user data:")
    for key, value in decrypted_data.items():
        print(f"   {key}: {value}")
    print()
    
    if decrypted_data == user_data:
        print("✅ Test 2 PASSED: Dictionary encryption/decryption works!")
    else:
        print("❌ Test 2 FAILED: Decrypted data doesn't match original")
    
    print()
    print("=" * 70)
    print("✅ All encryption tests completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    test_encryption()
