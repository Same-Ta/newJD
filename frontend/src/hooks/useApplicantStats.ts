import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { applicationAPI } from '@/services/api';

export interface StatusStats {
    total: number;
    passed: number;
    pending: number;
    rejected: number;
    reviewing: number;
    thisMonth: number;
}

export interface DailyCount {
    date: string;
    count: number;
}

export interface RecentApplicant {
    name: string;
    date: string;
    status?: string;
}

interface UseApplicantStatsResult {
    stats: StatusStats;
    dailyData: DailyCount[];
    recentApplicants: RecentApplicant[];
    loading: boolean;
    applications: any[];
}

/**
 * 지원자 통계 데이터를 가져오는 공용 훅
 * DashboardHome, ApplicantAnalytics에서 공유
 */
export const useApplicantStats = (): UseApplicantStatsResult => {
    const [stats, setStats] = useState<StatusStats>({
        total: 0,
        passed: 0,
        pending: 0,
        rejected: 0,
        reviewing: 0,
        thisMonth: 0
    });
    const [dailyData, setDailyData] = useState<DailyCount[]>([]);
    const [recentApplicants, setRecentApplicants] = useState<RecentApplicant[]>([]);
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    setLoading(false);
                    return;
                }

                const applications = await applicationAPI.getAll();
                setApplications(applications);

                let passed = 0;
                let pending = 0;
                let rejected = 0;
                let reviewing = 0;
                let thisMonth = 0;

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                // 최근 7일 데이터
                const last7Days: { [key: string]: number } = {};
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    last7Days[dateStr] = 0;
                }

                applications.forEach((app: any) => {
                    if (app.status === '합격') passed++;
                    else if (app.status === '보류') pending++;
                    else if (app.status === '불합격') rejected++;
                    else if (app.status === '검토중') reviewing++;

                    if (app.appliedAt) {
                        const appliedDate = app.appliedAt.seconds
                            ? new Date(app.appliedAt.seconds * 1000)
                            : app.appliedAt.toDate
                                ? app.appliedAt.toDate()
                                : new Date(app.appliedAt);

                        if (appliedDate.getMonth() === currentMonth && appliedDate.getFullYear() === currentYear) {
                            thisMonth++;
                        }

                        const dateStr = appliedDate.toISOString().split('T')[0];
                        if (last7Days.hasOwnProperty(dateStr)) {
                            last7Days[dateStr]++;
                        }
                    }
                });

                setStats({ total: applications.length, passed, pending, rejected, reviewing, thisMonth });

                const chartData = Object.keys(last7Days).map(date => ({
                    date,
                    count: last7Days[date]
                }));
                setDailyData(chartData);

                // 최근 지원자 5명
                const sortedApplicants = applications
                    .filter((app: any) => app.appliedAt && (app.name || app.applicantName))
                    .sort((a: any, b: any) => {
                        const dateA = a.appliedAt.seconds ? new Date(a.appliedAt.seconds * 1000) : new Date(a.appliedAt);
                        const dateB = b.appliedAt.seconds ? new Date(b.appliedAt.seconds * 1000) : new Date(b.appliedAt);
                        return dateB.getTime() - dateA.getTime();
                    })
                    .slice(0, 5)
                    .map((app: any) => {
                        const appliedDate = app.appliedAt.seconds ? new Date(app.appliedAt.seconds * 1000) : new Date(app.appliedAt);
                        return {
                            name: app.name || app.applicantName || '익명',
                            date: appliedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, ''),
                            status: app.status
                        };
                    });
                setRecentApplicants(sortedApplicants);

            } catch (error) {
                console.error('통계 로딩 실패:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    return { stats, dailyData, recentApplicants, loading, applications };
};

/**
 * SVG 차트 경로 생성 유틸
 */
export const generateChartPath = (dailyData: DailyCount[]): { mainPath: string; areaPath: string } => {
    if (dailyData.length === 0) {
        const mainPath = "M0,130 L400,130";
        return { mainPath, areaPath: mainPath + " V150 H0 Z" };
    }

    const maxCount = Math.max(...dailyData.map(d => d.count), 1);
    const points = dailyData.map((d, i) => {
        const x = (i / (dailyData.length - 1)) * 400;
        const y = 150 - (d.count / maxCount) * 120;
        return { x, y };
    });

    let mainPath = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpX = (prev.x + curr.x) / 2;
        mainPath += ` Q${cpX},${prev.y} ${curr.x},${curr.y}`;
    }

    return { mainPath, areaPath: mainPath + " V150 H0 Z" };
};
