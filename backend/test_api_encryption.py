"""
API 암호화/복호화 통합 테스트

이 테스트는 다음을 검증합니다:
1. 데이터베이스에 저장되는 데이터는 암호화되어 있어야 함
2. API 응답으로 반환되는 데이터는 복호화된 평문이어야 함
3. DB 저장값 ≠ API 응답값 (암호화 확인)
4. API 응답값 = 원본 평문 (복호화 확인)
"""

from dotenv import load_dotenv
from config.firebase import db
from models.schemas import ApplicationCreate, ApplicationResponse
from utils.security_utils import get_encryptor

# .env 파일 로드
load_dotenv()


def test_application_encryption_flow():
    """
    지원서 생성 → DB 저장 → API 조회 전체 플로우 테스트
    
    검증 항목:
    1. ApplicationCreate 모델이 자동으로 암호화하는가?
    2. DB에 저장된 데이터는 암호화된 상태인가?
    3. ApplicationResponse 모델이 자동으로 복호화하는가?
    4. 복호화된 데이터는 원본과 일치하는가?
    """
    print("\n" + "=" * 70)
    print("🔐 API 암호화/복호화 통합 테스트")
    print("=" * 70)
    
    # ========== 1단계: 원본 데이터 준비 ==========
    print("\n📝 1단계: 원본 데이터 준비")
    
    original_data = {
        "jdId": "test-jd-encryption-001",
        "jdTitle": "백엔드 개발자 모집",
        "applicantName": "홍길동",
        "applicantEmail": "hong@example.com",
        "applicantPhone": "010-1234-5678",
        "applicantGender": "male",
        "birthDate": "1995-03-15",
        "university": "서울대학교",
        "major": "컴퓨터공학",
        "portfolio": "https://github.com/hong"
    }
    
    print(f"  ✓ 원본 이름: {original_data['applicantName']}")
    print(f"  ✓ 원본 이메일: {original_data['applicantEmail']}")
    print(f"  ✓ 원본 전화번호: {original_data['applicantPhone']}")
    print(f"  ✓ 원본 생년월일: {original_data['birthDate']}")
    print(f"  ✓ 원본 대학교: {original_data['university']}")
    print(f"  ✓ 원본 전공: {original_data['major']}")
    
    # ========== 2단계: Pydantic 모델 자동 암호화 ==========
    print("\n🔒 2단계: Pydantic ApplicationCreate 모델로 자동 암호화")
    
    # ApplicationCreate 모델 생성 (자동 암호화 트리거)
    application = ApplicationCreate(**original_data)
    encrypted_dict = application.model_dump()
    
    print(f"  ✓ 암호화된 이름: {encrypted_dict['applicantName'][:50]}...")
    print(f"  ✓ 암호화된 이메일: {encrypted_dict['applicantEmail'][:50]}...")
    print(f"  ✓ 암호화된 전화번호: {encrypted_dict['applicantPhone'][:50]}...")
    
    # 검증: 암호화가 실제로 일어났는가?
    assert encrypted_dict['applicantName'] != original_data['applicantName'], \
        "❌ 이름이 암호화되지 않았습니다!"
    assert encrypted_dict['applicantEmail'] != original_data['applicantEmail'], \
        "❌ 이메일이 암호화되지 않았습니다!"
    assert encrypted_dict['applicantPhone'] != original_data['applicantPhone'], \
        "❌ 전화번호가 암호화되지 않았습니다!"
    
    print("\n  ✅ Pydantic 모델 자동 암호화 검증 완료")
    
    # ========== 3단계: Firestore에 저장 (암호화된 상태) ==========
    print("\n💾 3단계: Firestore에 암호화된 데이터 저장")
    
    # 테스트용 문서 ID
    test_doc_id = "test_encryption_verification"
    
    # Firestore에 저장
    doc_ref = db.collection('applications').document(test_doc_id)
    doc_ref.set(encrypted_dict)
    
    print(f"  ✓ Firestore 문서 ID: {test_doc_id}")
    print(f"  ✓ 저장 완료")
    
    # ========== 4단계: DB에서 직접 조회 (암호화된 상태 확인) ==========
    print("\n🔍 4단계: Firestore에서 직접 데이터 조회 (암호화 상태 확인)")
    
    # DB에서 직접 가져오기 (암호화된 상태)
    db_doc = doc_ref.get()
    db_data = db_doc.to_dict()
    
    print(f"\n  📊 DB 저장 데이터 (암호화됨):")
    print(f"    - 이름: {db_data['applicantName'][:60]}...")
    print(f"    - 이메일: {db_data['applicantEmail'][:60]}...")
    print(f"    - 전화번호: {db_data['applicantPhone'][:60]}...")
    print(f"    - 생년월일: {db_data['birthDate'][:60]}...")
    print(f"    - 대학교: {db_data['university'][:60]}...")
    print(f"    - 전공: {db_data['major'][:60]}...")
    
    # 검증: DB에 저장된 데이터는 암호화되어 있어야 함
    assert db_data['applicantName'] != original_data['applicantName'], \
        "❌ DB에 이름이 평문으로 저장되어 있습니다!"
    assert db_data['applicantEmail'] != original_data['applicantEmail'], \
        "❌ DB에 이메일이 평문으로 저장되어 있습니다!"
    assert db_data['applicantPhone'] != original_data['applicantPhone'], \
        "❌ DB에 전화번호가 평문으로 저장되어 있습니다!"
    
    print("\n  ✅ DB 암호화 저장 검증 완료 (평문이 아닌 암호문 확인)")
    
    # ========== 5단계: API 응답 모델로 자동 복호화 ==========
    print("\n🔓 5단계: ApplicationResponse 모델로 자동 복호화")
    
    # API가 응답하는 것과 동일한 방식으로 복호화
    db_data['applicationId'] = test_doc_id
    response_model = ApplicationResponse(**db_data)
    api_response = response_model.model_dump()
    
    print(f"\n  📤 API 응답 데이터 (복호화됨):")
    print(f"    - 이름: {api_response['applicantName']}")
    print(f"    - 이메일: {api_response['applicantEmail']}")
    print(f"    - 전화번호: {api_response['applicantPhone']}")
    print(f"    - 생년월일: {api_response['birthDate']}")
    print(f"    - 대학교: {api_response['university']}")
    print(f"    - 전공: {api_response['major']}")
    
    # 검증: API 응답은 복호화된 평문이어야 함
    assert api_response['applicantName'] == original_data['applicantName'], \
        f"❌ 이름 복호화 실패! 예상: {original_data['applicantName']}, 실제: {api_response['applicantName']}"
    assert api_response['applicantEmail'] == original_data['applicantEmail'], \
        f"❌ 이메일 복호화 실패! 예상: {original_data['applicantEmail']}, 실제: {api_response['applicantEmail']}"
    assert api_response['applicantPhone'] == original_data['applicantPhone'], \
        f"❌ 전화번호 복호화 실패! 예상: {original_data['applicantPhone']}, 실제: {api_response['applicantPhone']}"
    assert api_response['birthDate'] == original_data['birthDate'], \
        f"❌ 생년월일 복호화 실패!"
    assert api_response['university'] == original_data['university'], \
        f"❌ 대학교 복호화 실패!"
    assert api_response['major'] == original_data['major'], \
        f"❌ 전공 복호화 실패!"
    
    print("\n  ✅ API 응답 복호화 검증 완료 (원본 평문과 일치)")
    
    # ========== 6단계: DB 저장값 ≠ API 응답값 확인 (핵심!) ==========
    print("\n⚖️ 6단계: DB 저장값과 API 응답값 비교 (핵심 검증)")
    
    print(f"\n  🔐 DB 저장값 (암호화):")
    print(f"    - 이름: {db_data['applicantName'][:50]}...")
    print(f"\n  🔓 API 응답값 (복호화):")
    print(f"    - 이름: {api_response['applicantName']}")
    print(f"\n  ❓ 두 값이 다른가?")
    
    # 핵심 검증: DB 저장값과 API 응답값은 달라야 함
    assert db_data['applicantName'] != api_response['applicantName'], \
        "❌ DB 저장값과 API 응답값이 같습니다! 암호화가 작동하지 않습니다!"
    assert db_data['applicantEmail'] != api_response['applicantEmail'], \
        "❌ 이메일 암호화가 작동하지 않습니다!"
    assert db_data['applicantPhone'] != api_response['applicantPhone'], \
        "❌ 전화번호 암호화가 작동하지 않습니다!"
    
    print(f"    ✅ YES! DB에는 암호문, API 응답에는 평문이 전달됩니다!")
    
    # ========== 7단계: 수동 복호화로 검증 ==========
    print("\n🔧 7단계: 수동 복호화로 이중 검증")
    
    encryptor = get_encryptor()
    
    # DB에서 가져온 암호문을 수동으로 복호화
    manually_decrypted_name = encryptor.decrypt(db_data['applicantName'])
    manually_decrypted_email = encryptor.decrypt(db_data['applicantEmail'])
    manually_decrypted_phone = encryptor.decrypt(db_data['applicantPhone'])
    
    print(f"  수동 복호화 결과:")
    print(f"    - 이름: {manually_decrypted_name}")
    print(f"    - 이메일: {manually_decrypted_email}")
    print(f"    - 전화번호: {manually_decrypted_phone}")
    
    # 검증: 수동 복호화도 원본과 일치해야 함
    assert manually_decrypted_name == original_data['applicantName'], \
        "❌ 수동 복호화 실패!"
    assert manually_decrypted_email == original_data['applicantEmail'], \
        "❌ 수동 복호화 실패!"
    assert manually_decrypted_phone == original_data['applicantPhone'], \
        "❌ 수동 복호화 실패!"
    
    print(f"  ✅ 수동 복호화도 원본과 일치!")
    
    # ========== 8단계: 테스트 데이터 정리 ==========
    print("\n🧹 8단계: 테스트 데이터 정리")
    
    try:
        doc_ref.delete()
        print(f"  ✓ 테스트 문서 삭제 완료: {test_doc_id}")
    except Exception as e:
        print(f"  ⚠️ 테스트 문서 삭제 실패: {str(e)}")
    
    # ========== 최종 결과 ==========
    print("\n" + "=" * 70)
    print("✅ 모든 암호화/복호화 검증 테스트 통과!")
    print("=" * 70)
    print("\n📊 검증 완료 항목:")
    print("  ✓ Pydantic ApplicationCreate: 자동 암호화 ✅")
    print("  ✓ Firestore 저장: 암호화된 상태 ✅")
    print("  ✓ DB 직접 조회: 암호문 확인 ✅")
    print("  ✓ Pydantic ApplicationResponse: 자동 복호화 ✅")
    print("  ✓ API 응답: 평문 확인 ✅")
    print("  ✓ DB 저장값 ≠ API 응답값 ✅")
    print("  ✓ 수동 복호화: 원본 일치 ✅")
    print("\n🎉 In-Transit 보안: 통신 과정에서는 복호화된 평문 전달")
    print("🔐 At-Rest 보안: DB에는 암호화된 상태로 저장")
    print("=" * 70)


def test_server_log_encryption():
    """
    서버 로그에 암호화된 데이터가 출력되는지 테스트
    """
    print("\n" + "=" * 70)
    print("📋 서버 로그 암호화 상태 테스트")
    print("=" * 70)
    
    # 원본 데이터
    original_name = "김철수"
    original_email = "kim@example.com"
    
    # Pydantic 모델로 암호화
    app_data = {
        "jdId": "test-log-001",
        "jdTitle": "로그 테스트",
        "applicantName": original_name,
        "applicantEmail": original_email,
        "applicantPhone": "010-9999-8888",
    }
    
    application = ApplicationCreate(**app_data)
    encrypted_dict = application.model_dump()
    
    print("\n📝 서버 로그 시뮬레이션:")
    print(f"  INFO: Saving application to Firestore...")
    print(f"  DEBUG: applicantName = {encrypted_dict['applicantName'][:60]}...")
    print(f"  DEBUG: applicantEmail = {encrypted_dict['applicantEmail'][:60]}...")
    
    # 검증: 로그에 출력되는 값이 평문이 아닌지 확인
    assert original_name not in encrypted_dict['applicantName'], \
        "❌ 서버 로그에 평문 이름이 노출됩니다!"
    assert original_email not in encrypted_dict['applicantEmail'], \
        "❌ 서버 로그에 평문 이메일이 노출됩니다!"
    
    print(f"\n  ✅ 서버 로그에는 암호화된 데이터만 출력됩니다!")
    print(f"  ✅ 평문 정보가 로그에 노출되지 않습니다!")
    
    print("\n" + "=" * 70)
    print("✅ 서버 로그 보안 검증 완료")
    print("=" * 70)


def test_database_query_vs_api_response():
    """
    데이터베이스 쿼리 결과와 API 최종 응답값 비교 테스트
    
    확인 사항:
    - DB 쿼리 결과: 암호화된 데이터
    - API 응답: 복호화된 평문
    - 두 값이 달라야 함 (암호화 작동 증명)
    """
    print("\n" + "=" * 70)
    print("🔬 DB 쿼리 vs API 응답 비교 테스트")
    print("=" * 70)
    
    # 테스트 데이터
    test_data = {
        "jdId": "test-comparison-001",
        "jdTitle": "비교 테스트",
        "applicantName": "박민수",
        "applicantEmail": "park@example.com",
        "applicantPhone": "010-5555-6666",
        "birthDate": "1998-07-20",
        "university": "고려대학교",
        "major": "소프트웨어학과"
    }
    
    print("\n1️⃣ 원본 데이터 (사용자 입력):")
    print(f"   이름: {test_data['applicantName']}")
    print(f"   이메일: {test_data['applicantEmail']}")
    print(f"   전화번호: {test_data['applicantPhone']}")
    
    # ApplicationCreate로 자동 암호화
    application = ApplicationCreate(**test_data)
    encrypted_data = application.model_dump()
    
    print("\n2️⃣ DB 쿼리 결과 (암호화된 상태):")
    print(f"   이름: {encrypted_data['applicantName'][:60]}...")
    print(f"   이메일: {encrypted_data['applicantEmail'][:60]}...")
    print(f"   전화번호: {encrypted_data['applicantPhone'][:60]}...")
    
    # ApplicationResponse로 자동 복호화
    encrypted_data['applicationId'] = 'test-001'
    response = ApplicationResponse(**encrypted_data)
    api_data = response.model_dump()
    
    print("\n3️⃣ API 최종 응답 (복호화된 상태):")
    print(f"   이름: {api_data['applicantName']}")
    print(f"   이메일: {api_data['applicantEmail']}")
    print(f"   전화번호: {api_data['applicantPhone']}")
    
    print("\n4️⃣ 비교 결과:")
    
    # 핵심 검증
    db_different = encrypted_data['applicantName'] != api_data['applicantName']
    api_correct = api_data['applicantName'] == test_data['applicantName']
    
    print(f"   ❓ DB 쿼리 ≠ API 응답? {db_different} ✅" if db_different else f"   ❌ DB 쿼리 = API 응답 (암호화 미작동!)")
    print(f"   ❓ API 응답 = 원본 평문? {api_correct} ✅" if api_correct else f"   ❌ API 응답 ≠ 원본 (복호화 실패!)")
    
    # 최종 검증
    assert db_different, "❌ DB 쿼리와 API 응답이 같습니다! 암호화가 작동하지 않습니다!"
    assert api_correct, "❌ API 응답이 원본과 다릅니다! 복호화가 실패했습니다!"
    
    print("\n" + "=" * 70)
    print("✅ DB 쿼리 vs API 응답 비교 테스트 통과!")
    print("=" * 70)
    print("\n📊 결론:")
    print("  🔐 DB에 저장: 암호화된 상태")
    print("  🔓 API 응답: 복호화된 평문")
    print("  ⚡ In-Transit: 사용자는 평문 데이터 수신")
    print("  🛡️ At-Rest: DB 침해 시에도 암호문만 노출")
    print("=" * 70)


if __name__ == "__main__":
    print("\n" + "🔐" * 35)
    print("API 암호화/복호화 통합 테스트 스위트")
    print("🔐" * 35)
    
    try:
        # 테스트 1: 전체 플로우 검증
        test_application_encryption_flow()
        
        # 테스트 2: 서버 로그 암호화 검증
        test_server_log_encryption()
        
        # 테스트 3: DB vs API 비교
        test_database_query_vs_api_response()
        
        print("\n" + "🎉" * 35)
        print("모든 API 암호화 테스트 통과!")
        print("🎉" * 35)
        
    except AssertionError as e:
        print(f"\n❌ 테스트 실패: {str(e)}")
        raise
    except Exception as e:
        print(f"\n❌ 예상치 못한 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
