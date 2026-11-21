export function isQiadIntegration(url: string | null | undefined) {
 try { return !!url && new URL(url).pathname === '/api/method/qiad_logistics.wassla_webhooks.receive'; } catch { return false; }
}

export function qiadPhone(value: string | null | undefined, market = 'SD') {
 if(!value||value.trim().length>30)return null;
 let phone=value.trim().replace(/[\s()-]/g,'');
 const code=market==='SA'?'966':'249';
 if(phone.startsWith('00'))phone='+'+phone.slice(2);else if(phone.startsWith('0'))phone='+'+code+phone.slice(1);else if(phone.startsWith(code))phone='+'+phone;
 return /^\+[1-9][0-9]{6,14}$/.test(phone)?phone:null;
}
