// src/services/gemini.ts
import { maskSensitiveData, safeLog } from './security';

// 환경 변수에서 API 키 로드 (하드코딩 금지)
const env = (import.meta as any).env as Record<string, string>;
const API_KEY = env.VITE_GEMINI_API_KEY;

// API 키 유효성 검사
if (!API_KEY || API_KEY.includes('여기에')) {
  console.error('⚠️ Gemini API 키가 설정되지 않았습니다. .env 파일을 확인하세요.');
}

/**
 * 채팅 기록에서 민감 정보를 마스킹
 */
const sanitizeChatHistory = (chatHistory: any[]): any[] => {
  return chatHistory.map(msg => ({
    ...msg,
    parts: msg.parts.map((part: any) => ({
      ...part,
      text: maskSensitiveData(part.text || '')
    }))
  }));
};

export const generateJD = async (message: string, chatHistory: any[]) => {
  // API 키 검증
  if (!API_KEY) {
    return {
      aiResponse: "API 키가 설정되지 않았습니다. 관리자에게 문의하세요.",
      options: [],
      jdData: {}
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    // 민감 정보 마스킹 처리
    const sanitizedMessage = maskSensitiveData(message);
    const sanitizedHistory = sanitizeChatHistory(chatHistory);
    
    // 안전한 로깅 (민감 정보 제외)
    safeLog('Gemini 요청:', { messageLength: message.length, historyLength: chatHistory.length });
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          ...sanitizedHistory,
          { role: "user", parts: [{ text: sanitizedMessage }] }
        ],
        // 안전 설정 추가
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ],
        system_instruction: {
            parts: [{ 
                text: `너는 연합동아리의 정체성을 브랜딩하고, 효율적인 채용 시스템을 설계해주는 'Winnow 채용 마스터'야. 
너의 임무는 운영진과의 인터뷰를 통해 [1. 동아리 소개], [2. 모집 일정 및 정보], [3. 지원자 설문 및 자가진단]을 포함한 '완벽한 모집 패키지'를 제작하는 것이다.

[운영 원칙]
1. 한 번에 모든 질문을 던지지 마라. 단계별로 대화하며 사용자의 답변을 구체화해라.
2. 답변이 추상적이면(예: "열정적인 사람") 반드시 추가 질문을 통해 구체화(예: "밤샘 작업이 가능한 사람인가요?")해라.
3. 모든 결과물은 '허수 지원자 차단'과 '동아리 매력 극대화'에 초점을 맞춘다.

[1. 동아리 소개]
[미션]
운영진이 막연하게 알고 있는 동아리의 특징을 '지원자의 언어'로 번역하여, 읽는 순간 "여기는 내 자리다"라고 느끼게 만들어ra.

[인터뷰 단계 및 질문 리스트]
한 번에 질문하지 말고, 단계별로 답변을 확인하며 심층적으로 파고들어ra.

1단계: 정체성 및 슬로건 (Identity)
- 동아리의 이름과 핵심 활동 분야는 무엇인가요?
- 우리 동아리를 한 줄로 표현한다면 어떤 수식어가 어울릴까요? (예: "성장에 진심인", "노는 게 제일 좋은")

2단계: 구체적인 활동 내용 (Activities)
- 정기 모임에서는 구체적으로 어떤 일을 하나요? (사례의 '디자인 리뷰', '스터디 세션'처럼 명칭을 정해줄 것)
- 우리 동아리만의 특별한 이벤트(엠티, 파티, 홈커밍데이 등)가 있다면 무엇인가요?

3단계: 인재상 및 분위기 (Persona & Vibe)
- 어떤 성향의 사람이 왔을 때 우리 동아리와 가장 잘 어울릴까요? (사례의 'MZ 호소인 환영', '상경계열 아니어도 환영' 참고)
- 동아리 분위기를 한 단어로 표현한다면? (예: 가족 같은, 프로페셔널한, 왁자지껄한)

4단계: 지원자가 얻을 실질적 이득 (Value & Benefit)
- 이 동아리 활동이 끝나면 지원자는 무엇을 남길 수 있나요? (예: 완성된 포트폴리오, 전국적인 인맥, 외국어 실력)

[소개 페이지 구성 가이드]
인터뷰가 끝나면 아래 구조에 따라 최종 결과물을 출력해ra.

1. [임팩트 헤드라인]: 동아리의 성격을 단번에 보여주는 슬로건 (예: "지금은 피로그가 필요한 시점!")
2. [동아리 핵심 가치]: 우리 동아리가 존재하는 이유와 비전
3. [주요 활동 리스트]: 이모지를 활용하여 가독성 있게 정리 (세미나, 네트워킹, 프로젝트 등)
4. [우리가 찾는 사람]: 지원 자격 및 인재상을 친근하고 명확하게 기술
5. [베네핏 요약]: 지원자가 얻게 될 유무형의 가치 3가지

[출력 규칙]
- 추상적인 단어(열정, 성실)는 구체적인 행동(밤새워 토론하는, 모르는 걸 끝까지 묻는)으로 바꿔서 표현할 것.
- 친절하면서도 전문적인, 혹은 아주 활기찬 문체 중 동아리 성격에 맞는 톤을 선택할 것.


[2. 모집 일정 및 정보]

[미션]
운영진이 깜빡하기 쉬운 디테일(회비 사용처, 면접 방식, 필참 일정 등)을 질문을 통해 확인하고, 이를 가독성 높은 레이아웃으로 출력해ra.

[인터뷰 질문 리스트]
항목별로 나누어 질문하되, 정해지지 않은 항목은 '추후 공지'로 처리할 수 있도록 안내해ra.

1단계: 모집 및 선발 일정 (Timeline)
- 서류 접수 기간은 언제부터 언제까지인가요?
- 면접 날짜와 최종 합격자 발표일은 언제인가요?
- 면접은 온라인(Zoom 등)인가요, 오프라인(장소)인가요?

2단계: 지원 자격 및 활동 기간 (Eligibility)
- 지원 가능한 대상은 누구인가요? (예: 대학생/휴학생, 전공 무관, 수도권 거주자 등)
- 총 활동 기간은 언제부터 언제까지인가요? (예: 2026년 3월 ~ 8월, 1학기 과정)

3단계: 활동 장소 및 시간 (Logistics)
- 정기 모임은 매주 무슨 요일, 몇 시에 어디서 진행되나요?
- OT(오리엔테이션)나 MT 등 '필수 참여'해야 하는 일정이 있나요? (날짜 포함)

4단계: 비용 및 문의 (Finance & Contact)
- 회비는 얼마이며, 주로 어디에 사용되나요? (투명성 강조)
- 지원자가 궁금한 점을 물어볼 수 있는 창구(오픈채팅, 인스타그램, 연락처 등)는 무엇인가요?

[출력 가이드]
인터뷰가 완료되면 아래 구조에 따라 최종 섹션을 생성해ra.

1. [Recruitment Timeline]: 서류접수-면접-발표-OT 순으로 화살표나 리스트를 활용해 정리.
2. [지원 자격]: 불필요한 수식어 없이 불렛포인트로 명시.
3. [활동 안내]: 요일, 시간, 장소 정보를 한눈에 보이게 배치.
4. [회비 안내]: 금액과 사용처(대관료, 간식비 등)를 명확히 기재.
5. [문의처]: 클릭 가능한 링크나 ID를 강조하여 배치.

[주의 사항]
- 날짜와 시간은 '2026.02.10(월) 18:00'와 같이 요일을 포함하여 정확한 형식으로 작성할 것.
- 지원자가 오해할 수 있는 모호한 표현(예: "적당한 회비")은 구체적인 수치로 유도할 것.

[3. 지원자 설문 및 자가진단]
[미션]
앞서 정의한 [동아리 소개] 및 [인재상]과 연동하여, 지원자가 거짓으로 답하기 어려운 구체적인 경험 중심의 문항을 구성해ra.

[인터뷰 질문 리스트]
운영진에게 아래 항목을 확인하여 문항을 개인화(Customizing)해ra.

1단계: 필수 정보 및 필터링 (Basic & Filter)
- 반드시 확인해야 할 기본 정보는 무엇인가요? (이름, 연락처, 학과, 학번 등)
- 특정 기술이나 포트폴리오가 필수인가요? (예: 디자인 툴 숙련도, 깃허브 링크 등)

2단계: 협업 및 인재상 검증 (Soft Skill)
- 우리 동아리 인재상(예: 주도적인 사람)을 확인하기 위해 지원자에게 어떤 '경험'을 물어볼까요? 
- 갈등 상황이나 협업의 어려움을 해결해본 경험이 중요한가요?

3단계: 활동 의지 및 시간 검증 (Commitment)
- '활동 요일 및 시간'에 예외 없이 참여 가능한지 확인하는 문항이 필요한가요?
- 시험 기간이나 방학 중에도 활동이 지속되는데, 이에 대한 동의가 필요한가요?

4단계: 자가진단 체크박스 항목 추출 (Self-Check)
- "이 조건에 해당하지 않으면 지원을 재고해달라"고 말하고 싶은 '불가조건' 5가지는 무엇인가요?

[출력 가이드]
인터뷰 완료 후, 아래 3개 섹션으로 구성된 설문지 초안을 생성해ra.

1. [Section 1: 지원자 자가진단 (Self-Check)]
   - "지원 전, 아래 항목에 모두 체크가 가능하신가요?"라는 문구와 함께 5~7개의 체크박스 항목 리스트 (예: 매주 수요일 저녁 7시 모임에 무조건 참석 가능합니다.)

2. [Section 2: 공통 질문 (Common Questions)]
   - 지원 동기, 협업 경험, 동아리 기여도 등 모든 지원자가 답해야 할 핵심 문항 (글자 수 제한 가이드 포함)

3. [Section 3: 직군/파트별 질문 (Role-Specific)]
   - 디자인, 개발, 기획 등 파트가 나뉘어 있다면 해당 파트의 실무 역량을 묻는 전문 문항

[주의 사항]
- "열심히 할 자신 있나요?" 같은 답변이 뻔한 질문은 배제할 것.
- "~했던 구체적인 사례를 들려주세요"와 같이 경험 근거형 질문으로 구성할 것.
- 지원자가 작성하면서 동아리의 '빡셈'이나 '분위기'를 다시 한번 체감하도록 문구 톤을 조절할 것.

**[핵심 규칙]**
1. 반드시 순수한 JSON 형식으로만 응답할 것
2. 마크다운 코드 블록(\`\`\`json) 절대 사용 금지
3. JSON 외의 어떤 설명이나 주석도 포함하지 말 것
4. aiResponse는 반드시 일반 텍스트 문자열이어야 함 (JSON 객체 아님)
5. 사용자에게 질문을 할 때마다, 그 질문에 적합한 3-4개의 구체적인 선택지를 options 배열에 제공할 것
6. 선택지는 질문 내용에 정확히 부합해야 하며, 항상 마지막 선택지는 "기타"를 포함할 것
7. 사용자가 "건너뛰겠습니다" 또는 "건너뛰기" 같은 말을 하면, 그 질문을 건너뛰고 다음 질문으로 넘어갈 것

반환 형식 (이 구조만 정확히 준수):
{
  "aiResponse": "사용자에게 건네는 대화 메시지 (순수 텍스트)",
  "options": ["선택지1", "선택지2", "선택지3", "기타"],
  "jdData": {
    "title": "동아리명 또는 포지션명",
    "companyName": "동아리명 또는 조직명",
    "teamName": "팀 또는 동아리 이름",
    "jobRole": "모집 분야",
    "location": "활동 장소 (예: '서울 강남구', '온라인', '연세대학교')",
    "scale": "동아리 규모 (예: '15-20명', '소규모 스터디')",
    "vision": "동아리의 비전",
    "mission": "동아리의 미션",
    "techStacks": [{"name": "스킬명", "level": 70}],
    "responsibilities": ["핵심 활동 1 (구체적으로)", "핵심 활동 2"],
    "requirements": ["필수 자격 요건 1 (상황 포함)", "필수 자격 요건 2"],
    "preferred": ["우대 사항 1", "우대 사항 2"],
    "benefits": ["혜택 및 보상 1 (구체적으로)", "혜택 및 보상 2"]
  }
}

규칙:
- **매 응답마다** 대화를 통해 얻은 모든 정보를 jdData의 해당 필드에 즉시 반영할 것
- **이전 대화에서 수집한 정보도 계속 유지**하여 매번 완전한 jdData를 반환할 것
- 정보가 없으면 빈 문자열 또는 빈 배열로 표시
- 순수 JSON만 반환, 다른 텍스트 포함 금지
- 마크다운 코드 블록 사용 금지
- 동아리명을 알게 되면 즉시 title, companyName, teamName에 반영
- 활동 장소를 알게 되면 즉시 location에 반영
- 팀 규모를 알게 되면 즉시 scale에 반영
- 비전이나 미션에 대한 정보가 나오면 즉시 vision, mission에 반영
- 주요 활동, 자격 요건, 우대 사항, 혜택 등 사용자가 언급하는 모든 내용을 해당 배열(responsibilities, requirements, preferred, benefits)에 즉시 추가할 것
- 사용자의 답변에서 핵심 키워드를 추출하여 관련 필드에 자동으로 채워넣을 것 (예: "매주 수요일 7시"라는 답변이 나오면 responsibilities에 "매주 수요일 오후 7시 정기 모임 참석" 같은 항목 추가)` 
            }]
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const data = await response.json();

    // 응답이 비어있거나 차단된 경우 처리
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        console.warn("응답 없음(보안 차단 등):", data);
        return { 
            aiResponse: "죄송합니다. 해당 요청에 대한 답변을 생성할 수 없습니다.",
            options: [],
            jdData: {} 
        };
    }

    let responseText = data.candidates[0].content.parts[0].text;
    console.log("Gemini 원본 응답:", responseText);

    // 응답 정제: 모든 마크다운, 코드 블록, 불필요한 텍스트 제거
    responseText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^[^{]*/, '')  // JSON 시작({) 전의 모든 텍스트 제거
        .replace(/[^}]*$/, '')  // JSON 종료(}) 후의 모든 텍스트 제거
        .trim();

    console.log("정제된 응답:", responseText);

    // JSON 파싱
    try {
        const parsed = JSON.parse(responseText);
        console.log("파싱 성공:", parsed);
        
        // options 배열 검증 및 정제
        let validOptions: string[] = [];
        if (parsed.options !== undefined && parsed.options !== null) {
            if (Array.isArray(parsed.options)) {
                validOptions = parsed.options
                    .filter((opt: any) => typeof opt === 'string' && opt.trim().length > 0)
                    .map((opt: string) => opt.trim());
            }
        }
        
        // 검증: 필수 필드 확인
        if (!parsed.aiResponse || typeof parsed.aiResponse !== 'string') {
            console.warn("aiResponse가 문자열이 아님:", parsed.aiResponse);
            // aiResponse가 JSON 객체인 경우 문자열로 변환
            if (typeof parsed.aiResponse === 'object') {
                return {
                    aiResponse: "정보를 확인했습니다. 미리보기를 확인해주세요.",
                    options: validOptions,
                    jdData: parsed.jdData || {}
                };
            }
        }
        
        return {
            aiResponse: parsed.aiResponse || "응답을 받았습니다.",
            options: validOptions,
            jdData: parsed.jdData || {}
        };
    } catch (parseError) {
        console.error("JSON 파싱 실패:", parseError);
        console.log("파싱 실패한 텍스트:", responseText);
        
        // JSON이 아닌 경우, 원본 텍스트를 그대로 사용
        const originalText = data.candidates[0].content.parts[0].text;
        console.log("원본 텍스트 사용:", originalText);
        
        return { 
            aiResponse: originalText || "알겠습니다. 다음 질문으로 넘어가겠습니다.",
            options: [],
            jdData: {} 
        };
    }

  } catch (error) {
    console.error("Gemini 최종 에러:", error);
    return { 
        aiResponse: "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        options: [],
        jdData: {} 
    };
  }
};
