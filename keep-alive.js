// 콜드 스타트 방지용 Keep-alive 스크립트
// Vercel Cron Jobs나 외부 서비스에서 5분마다 실행하도록 설정
// 서버를 "warm" 상태로 유지하여 첫 요청 시 지연 최소화

const BACKEND_URL = process.env.BACKEND_URL || 'https://your-backend-url.render.com';
const TIMEOUT_MS = 10000; // 10초 타임아웃

async function keepAlive() {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const response = await fetch(`${BACKEND_URL}/keepalive`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Keep-Alive-Bot/1.0',
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Keep-alive success (${duration}ms):`, data);
    
    return { 
      success: true, 
      data,
      duration,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      console.error(`❌ Keep-alive timeout after ${duration}ms`);
      return { 
        success: false, 
        error: 'Request timeout',
        duration,
        timestamp: new Date().toISOString()
      };
    }
    
    console.error(`❌ Keep-alive failed (${duration}ms):`, error.message);
    return { 
      success: false, 
      error: error.message,
      duration,
      timestamp: new Date().toISOString()
    };
  }
}

// 헬스 체크를 위한 추가 엔드포인트 호출
async function healthCheck() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    const data = await response.json();
    console.log('🏥 Health check:', data);
    return { success: true, data };
  } catch (error) {
    console.error('🏥 Health check failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Firebase 연결 상태도 함께 확인하는 완전한 워밍
async function fullWarmup() {
  console.log('🔥 Starting full server warmup...');
  
  const results = {
    keepalive: await keepAlive(),
    health: await healthCheck()
  };
  
  const allSuccess = results.keepalive.success && results.health.success;
  
  console.log(allSuccess ? '✅ Server is fully warmed up' : '⚠️  Server warmup incomplete');
  
  return {
    success: allSuccess,
    results,
    timestamp: new Date().toISOString()
  };
}

// Vercel Edge Function으로 사용할 경우
export default async function handler(req, res) {
  const result = await fullWarmup();
  
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
}

// Node.js에서 직접 실행하는 경우
if (require.main === module) {
  fullWarmup().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}