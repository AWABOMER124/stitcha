export class DeploymentChangedError extends Error {
  constructor() { super('تم تحديث الموقع. حدّث الصفحة قبل إعادة تنفيذ الإجراء. لم نعد إرسال الطلب تلقائيًا.'); this.name = 'DeploymentChangedError'; }
}
export function isDeploymentError(error: { message?: string; name?: string }) {
  return error.name === 'DeploymentChangedError' || /(?:Failed to find Server Action|Server Action .*was not found|older or newer deployment|تم تحديث الموقع)/i.test(error.message ?? '');
}

/** Check before sending an action; never retry a mutation after an uncertain response. */
export function deploymentAwareFetch(original: typeof fetch, release: string, changed: () => void): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (method !== 'POST' || !headers.has('next-action')) return original(input, init);
    const version = await original('/api/deployment', { cache: 'no-store', credentials: 'same-origin' });
    if (!version.ok) throw new Error('تعذر التحقق من إصدار الموقع. لم يُرسل الإجراء؛ حاول مجددًا بعد عودة الاتصال.');
    const current = await version.json() as { release?: string };
    if (!current.release || current.release !== release) { changed(); throw new DeploymentChangedError(); }
    const response = await original(input, init);
    if (response.headers.get('x-nextjs-action-not-found') === '1') { changed(); throw new DeploymentChangedError(); }
    return response;
  };
}
