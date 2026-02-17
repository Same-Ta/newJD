import React, { useEffect, useState } from 'react';
import { BarChart3, Users, Eye, Brain, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  pageviews: Record<string, number>;
  jd_activity: Record<string, number>;
  ai_usage: Record<string, number>;
  period: string;
}

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/analytics/dashboard`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          사용 통계
        </h3>
        <p className="text-gray-500">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const totalPageviews = Object.values(data.pageviews).reduce((sum, count) => sum + count, 0);
  const totalJDActions = Object.values(data.jd_activity).reduce((sum, count) => sum + count, 0);
  const totalAIUsage = Object.values(data.ai_usage).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* 요약 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 페이지뷰</p>
              <p className="text-2xl font-bold text-gray-900">{totalPageviews.toLocaleString()}</p>
            </div>
            <Eye className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">JD 활동</p>
              <p className="text-2xl font-bold text-gray-900">{totalJDActions}</p>
            </div>
            <Users className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">AI 사용</p>
              <p className="text-2xl font-bold text-gray-900">{totalAIUsage}</p>
            </div>
            <Brain className="text-purple-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">기간</p>
              <p className="text-lg font-bold text-gray-900">최근 7일</p>
            </div>
            <TrendingUp className="text-orange-500" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 인기 페이지 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">인기 페이지</h4>
          <div className="space-y-3">
            {Object.entries(data.pageviews)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([page, count]) => (
                <div key={page} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{getPageDisplayName(page)}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* JD 활동 분석 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">JD 활동</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">생성</span>
              <span className="text-sm font-medium text-green-600">{data.jd_activity.create || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">조회</span>
              <span className="text-sm font-medium text-blue-600">{data.jd_activity.view || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">수정</span>
              <span className="text-sm font-medium text-orange-600">{data.jd_activity.edit || 0}</span>
            </div>
          </div>
        </div>

        {/* AI 기능 사용량 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">AI 기능 사용</h4>
          <div className="space-y-3">
            {Object.entries(data.ai_usage)
              .sort(([,a], [,b]) => b - a)
              .map(([feature, count]) => (
                <div key={feature} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{getFeatureDisplayName(feature)}</span>
                  <span className="text-sm font-medium text-purple-600">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function getPageDisplayName(page: string): string {
  const pageNames: Record<string, string> = {
    'landing': '랜딩 페이지',
    'login': '로그인',
    'signup': '회원가입',
    'dashboard': '대시보드',
    'jd-detail': 'JD 상세',
    'my-jds': '내 JD 목록',
    'applicant-list': '지원자 목록',
    'applicant-detail': '지원자 상세',
    'chat': '채팅',
    'settings': '설정',
    'team': '팀 관리'
  };
  return pageNames[page] || page;
}

function getFeatureDisplayName(feature: string): string {
  const featureNames: Record<string, string> = {
    'jd_generation': 'JD 생성',
    'applicant_analysis': '지원자 분석',
    'chat': 'AI 채팅',
    'evaluation': 'AI 평가'
  };
  return featureNames[feature] || feature;
}