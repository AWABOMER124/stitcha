import Link from 'next/link';
import { getAuthContext } from '@/lib/permissions';
import { getPersonalMessagesAction } from '@/modules/communications/actions';
import { MessagePreferences } from '@/modules/communications/components/message-preferences';
export const dynamic='force-dynamic';
export default async function MessagePreferencesPage(){
 await getAuthContext();
 const result=await getPersonalMessagesAction();
 if(!result.success)throw new Error(result.error);
 return <div dir="rtl" className="mx-auto max-w-4xl space-y-6"><header><h1 className="text-2xl font-black">تفضيلات الرسائل</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">تحكم في رسائل وصلة التي تصلك على البريد وواتساب.</p></header><MessagePreferences initial={result.data.preference}/><Link href="/inbox" className="inline-flex text-sm font-bold text-emerald-700">فتح رسائل المنصة ←</Link></div>;
}
