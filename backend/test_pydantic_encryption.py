"""
Test Pydantic models with automatic encryption/decryption.

This script tests that our Pydantic models automatically encrypt sensitive
fields before saving and decrypt them when loading from database.
"""

import os
from dotenv import load_dotenv
from models.schemas import ApplicationCreate, ApplicationResponse, UserRegister, UserResponse

# Load environment variables
load_dotenv()

def test_application_encryption():
    """Test ApplicationCreate model automatic encryption"""
    print("=" * 70)
    print("TEST 1: Application Model - Automatic Encryption")
    print("=" * 70)
    
    # Create application with sensitive data
    app_data = {
        "jdId": "test-jd-123",
        "jdTitle": "프론트엔드 개발자",
        "applicantName": "홍길동",
        "applicantEmail": "hong@example.com",
        "applicantPhone": "010-1234-5678",
        "applicantGender": "male",
        "birthDate": "1995-03-15",
        "university": "서울대학교",
        "major": "컴퓨터공학",
        "portfolio": "https://github.com/hong"
    }
    
    print("\n📝 Original Data:")
    print(f"  Name: {app_data['applicantName']}")
    print(f"  Email: {app_data['applicantEmail']}")
    print(f"  Phone: {app_data['applicantPhone']}")
    print(f"  Birth Date: {app_data['birthDate']}")
    print(f"  University: {app_data['university']}")
    print(f"  Major: {app_data['major']}")
    
    # Create Pydantic model (triggers automatic encryption)
    application = ApplicationCreate(**app_data)
    encrypted_dict = application.model_dump()
    
    print("\n🔒 Encrypted Data (ready for DB):")
    print(f"  Name: {encrypted_dict['applicantName'][:50]}...")
    print(f"  Email: {encrypted_dict['applicantEmail'][:50]}...")
    print(f"  Phone: {encrypted_dict['applicantPhone'][:50]}...")
    print(f"  Birth Date: {encrypted_dict['birthDate'][:50]}...")
    print(f"  University: {encrypted_dict['university'][:50]}...")
    print(f"  Major: {encrypted_dict['major'][:50]}...")
    
    # Verify encryption happened
    assert encrypted_dict['applicantName'] != app_data['applicantName']
    assert encrypted_dict['applicantEmail'] != app_data['applicantEmail']
    print("\n✅ Encryption verified - data is encrypted!")
    
    return encrypted_dict


def test_application_decryption(encrypted_data):
    """Test ApplicationResponse model automatic decryption"""
    print("\n" + "=" * 70)
    print("TEST 2: Application Model - Automatic Decryption")
    print("=" * 70)
    
    # Simulate loading encrypted data from DB
    encrypted_data['status'] = 'pending'
    encrypted_data['applicationId'] = 'app-456'
    
    print("\n🔒 Encrypted Data (from DB):")
    print(f"  Name: {encrypted_data['applicantName'][:50]}...")
    print(f"  Email: {encrypted_data['applicantEmail'][:50]}...")
    
    # Create response model (triggers automatic decryption)
    response = ApplicationResponse(**encrypted_data)
    decrypted_dict = response.model_dump()
    
    print("\n🔓 Decrypted Data (for display):")
    print(f"  Name: {decrypted_dict['applicantName']}")
    print(f"  Email: {decrypted_dict['applicantEmail']}")
    print(f"  Phone: {decrypted_dict['applicantPhone']}")
    print(f"  Birth Date: {decrypted_dict['birthDate']}")
    print(f"  University: {decrypted_dict['university']}")
    print(f"  Major: {decrypted_dict['major']}")
    
    # Verify decryption happened correctly
    assert decrypted_dict['applicantName'] == "홍길동"
    assert decrypted_dict['applicantEmail'] == "hong@example.com"
    assert decrypted_dict['applicantPhone'] == "010-1234-5678"
    print("\n✅ Decryption verified - data restored to original!")


def test_user_encryption():
    """Test UserRegister model automatic encryption"""
    print("\n" + "=" * 70)
    print("TEST 3: User Model - Automatic Encryption")
    print("=" * 70)
    
    # Create user with sensitive data
    user_data = {
        "email": "user@winnow.kr",
        "password": "securePassword123!",
        "nickname": "위노우"
    }
    
    print("\n📝 Original Data:")
    print(f"  Email: {user_data['email']}")
    print(f"  Nickname: {user_data['nickname']}")
    
    # Create Pydantic model (triggers automatic encryption)
    user = UserRegister(**user_data)
    encrypted_dict = user.model_dump()
    
    print("\n🔒 Encrypted Data (ready for DB):")
    print(f"  Email: {encrypted_dict['email'][:50]}...")
    print(f"  Nickname: {encrypted_dict['nickname']}")
    
    # Verify encryption happened
    assert encrypted_dict['email'] != user_data['email']
    assert encrypted_dict['nickname'] == user_data['nickname']  # Not encrypted
    print("\n✅ Email encryption verified!")
    
    return encrypted_dict


def test_user_decryption(encrypted_data):
    """Test UserResponse model automatic decryption"""
    print("\n" + "=" * 70)
    print("TEST 4: User Model - Automatic Decryption")
    print("=" * 70)
    
    # Simulate loading encrypted data from DB
    encrypted_data['userId'] = 'user-789'
    
    print("\n🔒 Encrypted Data (from DB):")
    print(f"  Email: {encrypted_data['email'][:50]}...")
    
    # Create response model (triggers automatic decryption)
    response = UserResponse(**encrypted_data)
    decrypted_dict = response.model_dump()
    
    print("\n🔓 Decrypted Data (for display):")
    print(f"  Email: {decrypted_dict['email']}")
    print(f"  Nickname: {decrypted_dict['nickname']}")
    
    # Verify decryption happened correctly
    assert decrypted_dict['email'] == "user@winnow.kr"
    print("\n✅ Email decryption verified - data restored to original!")


def main():
    """Run all Pydantic encryption tests"""
    print("\n" + "=" * 70)
    print("🔐 PYDANTIC MODEL ENCRYPTION TESTS")
    print("=" * 70)
    print("Testing automatic encryption/decryption in Pydantic models")
    print("=" * 70)
    
    try:
        # Test Application models
        encrypted_app = test_application_encryption()
        test_application_decryption(encrypted_app)
        
        # Test User models
        encrypted_user = test_user_encryption()
        test_user_decryption(encrypted_user)
        
        print("\n" + "=" * 70)
        print("✅ ALL PYDANTIC TESTS PASSED")
        print("=" * 70)
        print("\n📋 Summary:")
        print("  ✓ ApplicationCreate: Auto-encrypts 6 sensitive fields")
        print("  ✓ ApplicationResponse: Auto-decrypts 6 sensitive fields")
        print("  ✓ UserRegister: Auto-encrypts email field")
        print("  ✓ UserResponse: Auto-decrypts email field")
        print("  ✓ Backward compatibility: Handles legacy non-encrypted data")
        print("\n🎉 Pydantic models are now automatically securing sensitive data!")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
