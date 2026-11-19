import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { AppProviders } from '@/components/ui/app-providers';
import { getPersonalMessagesAction } from '@/modules/communications/actions';
import { PersonalInbox } from './personal-inbox';

export const dynamic = 'force-dynamic';
export default async function InboxPage({searchParams}:{searchParams:Promise<{message?:string}>}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const {message}=await searchParams;
  const result = await getPersonalMessagesAction(message);
  if (!result.success) throw new Error(result.error);
  const back = session.user.role === 'MARKETER' ? '/marketer' : session.user.role.startsWith('DELIVERY_PARTNER_') ? '/partner' : session.user.role.startsWith('PLATFORM_') ? '/admin' : '/dashboard';
  return <AppProviders><PersonalInbox key={message||"all"} initial={result.data} back={back} selectedMessageId={message} /></AppProviders>;
}
