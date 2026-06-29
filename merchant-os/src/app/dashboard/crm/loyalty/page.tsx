import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getLoyaltyConfigAction, getLoyaltyLeaderboardAction } from '@/modules/crm/actions';
import { LoyaltyClient } from './_client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LoyaltyPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const [configRes, leaderboardRes] = await Promise.all([
    getLoyaltyConfigAction(),
    getLoyaltyLeaderboardAction(),
  ]);

  const config = configRes.success ? configRes.data : null;
  const leaderboard = leaderboardRes.success ? (leaderboardRes.data as any[]) : [];

  return (
    <div dir="rtl" className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/dashboard/crm" className="hover:text-[var(--primary)]">CRM</Link>
          <span>/</span>
          <span>نقاط الولاء</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">برنامج الولاء</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">كافئ عملاءك المميزين بنقاط قابلة للاستبدال</p>
      </div>
      <LoyaltyClient initialConfig={config as any} leaderboard={leaderboard} />
    </div>
  );
}
