// src/services/gemini.ts

// ★ 중요: 여기에 실제 API 키를 넣거나 환경변수를 확인하세요.
const env = (import.meta as any).env as Record<string, string>;
const API_KEY = env.VITE_GEMINI_API_KEY || "AIzaSyD_여기에_직접_키를_넣어도_됩니다";

export const generateJD = async (message: string, chatHistory: any[]) => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          ...chatHistory,
          { role: "user", parts: [{ text: message }] }
        ],
        // 시스템 프롬프트 강화: JSON 구조 명시
        system_instruction: {
            parts: [{ 
                text: `너는 WINNOW 채용 담당자야. 사용자와 대화하며 채용 공고 정보를 수집해.

응답은 반드시 아래 JSON 구조로만 작성해. 마크다운, 코드 블록, 인사말, 추가 설명 절대 금지.

JSON 구조:
{
  "aiResponse": "사용자에게 건네는 말 (질문이나 답변)",
  "jdData": {
    "title": "직무명",
    "responsibilities": ["주요 업무 1", "주요 업무 2"],
    "requirements": ["자격 요건 1", "자격 요건 2"],
    "preferred": ["우대 사항 1", "우대 사항 2"],
    "benefits": ["복지 혜택 1", "복지 혜택 2"]
  }
}

규칙:
- 정보가 없으면 빈 문자열 또는 빈 배열로 표시
- 순수 JSON만 반환, 다른 텍스트 포함 금지
- 마크다운 코드 블록 사용 금지` 
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
            jdData: {} 
        };
    }

    let responseText = data.candidates[0].content.parts[0].text;
    console.log("Gemini 원본 응답:", responseText);

    // 응답 정제 (Cleanup): 마크다운 제거
    responseText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

    // 안전한 JSON 파싱
    try {
        // 정규식으로 { ... } 구간만 추출
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log("파싱 성공:", parsed);
            return parsed;
        } else {
            throw new Error("JSON 패턴 없음");
        }
    } catch (parseError) {
        console.warn("JSON 파싱 실패, 안전한 형태로 반환:", parseError);
        // 파싱 실패 시 안전한 형태로 반환
        return { 
            aiResponse: responseText,
            jdData: {} 
        };
    }

  } catch (error) {
    console.error("Gemini 최종 에러:", error);
    return { 
        aiResponse: "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        jdData: {} 
    };
  }
};