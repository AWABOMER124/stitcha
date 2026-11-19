export function isQiadIntegration(url: string | null | undefined) {
 try { return !!url && new URL(url).pathname === '/api/method/qiad_logistics.wassla_webhooks.receive'; } catch { return false; }
}

export function qiadPhone(value: string | null | undefined) {
 if(!value||value.trim().length>30)return null;
 let phone=value.trim().replace(/[\s()-]/g,'');
 if(phone.startsWith('00'))phone='+'+phone.slice(2);else if(phone.startsWith('0'))phone='+249'+phone.slice(1);else if(phone.startsWith('249'))phone='+'+phone;
 return /^\+[1-9][0-9]{6,14}$/.test(phone)?phone:null;
}
