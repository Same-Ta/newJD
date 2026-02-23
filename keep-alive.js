// ==================== Winnow Keep-Alive Service ====================
// Render Free Tier 서버 sleep 방지용 주기적 핑 스크립트
// 
// 사용법:
//   1. 직접 실행: node keep-alive.js
//   2. cron-job.org에서 14분마다 호출 (추천)
//   3. npm run keep-alive (package.json 스크립트)
//
// 환경변수:
//   BACKEND_URL - 백엔드 서버 URL (기본: Render 배포 URL)
// ================================================================

const BACKEND_URL = process.env.BACKEND_URL || 'https://winnow-backend.onrender.com';
const TIMEOUT_MS = 15000; // 15초 (Cold start 경우 대비 넉넉히)

async function keepAlive() {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const response = await fetch(`${BACKEND_URL}/keepalive`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Winnow-KeepAlive/2.0',
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    console.log(`✅ [${new Date().toISOString()}] Keep-alive OK (${duration}ms) - ${JSON.stringify(data)}`);
    
    return { success: true, data, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errMsg = error.name === 'AbortError' ? 'Timeout' : error.message;
    
    console.error(`❌ [${new Date().toISOString()}] Keep-alive FAIL (${duration}ms) - ${errMsg}`);
    return { success: false, error: errMsg, duration };
  }
}

async function healthCheck() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout?.(10000),
    });
    const data = await response.json();
    console.log(`🏥 [${new Date().toISOString()}] Health: ${JSON.stringify(data)}`);
    return { success: true, data };
  } catch (error) {
    console.error(`🏥 [${new Date().toISOString()}] Health FAIL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 전체 서버 워밍업
async function fullWarmup() {
  console.log(`\n🔥 [${new Date().toISOString()}] Starting server warmup → ${BACKEND_URL}`);
  
  const keepaliveResult = await keepAlive();
  
  // 첫 핑 실패 시 (Cold start 진행 중) 재시도
  if (!keepaliveResult.success) {
    console.log('⏳ Cold start detected, waiting 5s and retrying...');
    await new Promise(r => setTimeout(r, 5000));
    const retry = await keepAlive();
    if (retry.success) {
      console.log('✅ Retry succeeded - server is now awake');
    }
  }
  
  const healthResult = await healthCheck();
  
  const allSuccess = keepaliveResult.success && healthResult.success;
  console.log(allSuccess ? '🟢 Server fully warmed up\n' : '🟡 Warmup incomplete\n');
  
  return { success: allSuccess, keepalive: keepaliveResult, health: healthResult };
}

// ==================== 실행 모드 ====================

// Vercel Serverless Function으로 사용할 경우
export default async function handler(req, res) {
  const result = await fullWarmup();
  res.status(result.success ? 200 : 503).json(result);
}

// 독립 실행 모드 (node keep-alive.js)
const isMain = typeof require !== 'undefined' && require.main === module;
if (isMain) {
  // 인자로 --loop 전달 시 14분 간격 반복 실행
  if (process.argv.includes('--loop')) {
    const INTERVAL = 13 * 60 * 1000; // 13분
    console.log(`🔄 Loop mode: pinging every 13 minutes`);
    fullWarmup(); // 즉시 한번 실행
    setInterval(fullWarmup, INTERVAL);
  } else {
    // 단일 실행 (cron-job.org 등에서 호출)
    fullWarmup().then(result => {
      process.exit(result.success ? 0 : 1);
    });
  }
}