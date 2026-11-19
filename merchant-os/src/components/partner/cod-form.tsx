'use client';
import { useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { recordPartnerCodAction,confirmMerchantCodAction } from '@/modules/delivery-partners/cod.actions';
export function CodForm({shipmentId,kind,amount,currency}:{shipmentId:string;kind:'COLLECTED'|'REMITTED'|'CONFIRMED';amount:string;currency:string}){
 const [pending,start]=useTransition(),[error,setError]=useState('');const router=useRouter();
 const label=kind==='COLLECTED'?'تسجيل تحصيل فعلي':kind==='REMITTED'?'تسجيل توريد فعلي':'تأكيد استلام المبلغ';
 return <form data-action-guard="off" className="space-y-3 print:hidden" onSubmit={event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));if(!window.confirm(label+'؟ أكّد فقط حركة حدثت فعليًا.'))return;start(async()=>{const result=kind==='CONFIRMED'?await confirmMerchantCodAction(shipmentId):await recordPartnerCodAction(shipmentId,kind,data);if(!result.success)setError(result.error||'تعذر التسجيل');else router.refresh();});}}>
 {kind!=='CONFIRMED'&&<><label className="block text-sm">المبلغ<input name="amount" type="number" min="0.01" step="0.01" required defaultValue={amount} className="mt-1 block w-full rounded-xl border p-2"/></label><input type="hidden" name="currency" value={currency}/><label className="block text-sm">مرجع إيصال التحصيل أو التوريد<input name="reference" required minLength={3} maxLength={140} className="mt-1 block w-full rounded-xl border p-2"/></label></>}
 <p className="text-xs text-slate-600">يسجل هذا الإجراء الحركة للتدقيق ولا ينفذ تحويل أموال.</p>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={pending} className="rounded-xl border px-4 py-2 font-bold disabled:opacity-50">{pending?'جارٍ التسجيل…':label}</button></form>;
}
