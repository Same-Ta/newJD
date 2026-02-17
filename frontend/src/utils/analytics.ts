// 사용자 행동 분석을 위한 커스텀 추적 시스템
class UserAnalytics {
  private sessionId: string;
  private userId: string | null = null;
  private startTime: number = Date.now();
  private events: any[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initTracking();
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // 페이지 조회 추적
  trackPageView(page: string) {
    this.trackEvent('page_view', {
      page,
      timestamp: Date.now(),
      referrer: document.referrer,
      userAgent: navigator.userAgent.slice(0, 200) // 축약된 UA
    });
  }

  // 사용자 행동 추적
  trackEvent(eventName: string, properties: any = {}) {
    const event = {
      sessionId: this.sessionId,
      userId: this.userId,
      event: eventName,
      properties: {
        ...properties,
        timestamp: Date.now(),
        url: window.location.href,
        pathname: window.location.pathname
      }
    };

    this.events.push(event);
    this.sendEvent(event);
  }

  // 사용자 식별 (로그인 시)
  identifyUser(userId: string, properties?: any) {
    this.userId = userId;
    this.trackEvent('user_identify', { userId, ...properties });
  }

  // 버튼 클릭 추적
  trackClick(element: string, context?: string) {
    this.trackEvent('click', {
      element,
      context,
      text: element.slice(0, 50) // 버튼 텍스트 일부
    });
  }

  // 폼 제출 추적
  trackFormSubmit(formName: string, success: boolean = true) {
    this.trackEvent('form_submit', {
      formName,
      success,
      timeOnPage: Date.now() - this.startTime
    });
  }

  // JD 생성/조회 추적
  trackJDActivity(action: string, jdId?: string, metadata?: any) {
    this.trackEvent('jd_activity', {
      action, // 'create', 'view', 'edit', 'delete'
      jdId,
      ...metadata
    });
  }

  // 지원자 관리 추적
  trackApplicantActivity(action: string, applicantId?: string, jdId?: string) {
    this.trackEvent('applicant_activity', {
      action, // 'view', 'evaluate', 'approve', 'reject'
      applicantId,
      jdId
    });
  }

  // AI 사용 추적
  trackAIUsage(feature: string, usage: any) {
    this.trackEvent('ai_usage', {
      feature, // 'jd_generation', 'applicant_analysis'
      ...usage
    });
  }

  // 스크롤 깊이 추적
  private trackScrollDepth() {
    let maxScroll = 0;
    const trackScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        if (scrollPercent % 25 === 0) { // 25%, 50%, 75%, 100%
          this.trackEvent('scroll_depth', { percent: scrollPercent });
        }
      }
    };

    window.addEventListener('scroll', trackScroll, { passive: true });
  }

  // 세션 시간 추적
  private trackSessionTime() {
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session_end', {
        duration: Date.now() - this.startTime,
        eventsCount: this.events.length
      });
    });
  }

  // 이벤트 전송 (배치 처리)
  private sendEvent(event: any) {
    // 즉시 전송하지 않고 배치로 처리
    this.sendBatch();
  }

  private async sendBatch() {
    if (this.events.length === 0) return;

    try {
      // 백엔드 API로 전송
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          events: this.events.splice(0, 10) // 최대 10개씩 전송
        })
      });
    } catch (error) {
      console.log('Analytics error:', error);
      // 실패시 LocalStorage에 저장 후 재시도
      this.saveToLocalStorage();
    }
  }

  // 오프라인 데이터 저장
  private saveToLocalStorage() {
    const stored = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    stored.push(...this.events);
    localStorage.setItem('analytics_events', JSON.stringify(stored.slice(-100))); // 최대 100개 보관
  }

  // 초기 설정
  private initTracking() {
    this.trackScrollDepth();
    this.trackSessionTime();
    this.trackPageView(window.location.pathname);

    // 저장된 이벤트 재전송
    this.retryFailedEvents();

    // 주기적 배치 전송
    setInterval(() => this.sendBatch(), 30000); // 30초마다
  }

  private retryFailedEvents() {
    const stored = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    if (stored.length > 0) {
      this.events.push(...stored);
      localStorage.removeItem('analytics_events');
    }
  }
}

// 전역 인스턴스
const analytics = new UserAnalytics();

// 자동 추적 설정
document.addEventListener('DOMContentLoaded', () => {
  // 모든 버튼 클릭 추적
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      const button = target.closest('button') || target;
      analytics.trackClick(button.textContent || button.className);
    }
  });

  // 외부 링크 클릭 추적
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (link && link.hostname !== window.location.hostname) {
      analytics.trackEvent('external_link_click', {
        url: link.href,
        text: link.textContent?.slice(0, 50)
      });
    }
  });
});

export default analytics;