import { describe, expect, it, vi } from 'vitest';
import { deploymentAwareFetch } from './deployment-guard';
const action = { method: 'POST', headers: { 'next-action': 'action-id' }, body: 'payload' };
describe('deployment action guard', () => {
 it('blocks an old page before any state-changing request', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ release: 'new' })); const changed = vi.fn();
  await expect(deploymentAwareFetch(fetcher, 'old', changed)('/orders', action)).rejects.toThrow('تم تحديث الموقع');
  expect(fetcher).toHaveBeenCalledTimes(1); expect(changed).toHaveBeenCalledOnce();
 });
 it('forwards a current action exactly once with its original body', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ release: 'same' })).mockResolvedValueOnce(new Response('ok'));
  await deploymentAwareFetch(fetcher,'same',vi.fn())('/orders', action);
  expect(fetcher).toHaveBeenCalledTimes(2); expect(fetcher).toHaveBeenLastCalledWith('/orders',action);
 });
 it('does not replay an action missing from the server build', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ release: 'same' })).mockResolvedValueOnce(new Response('', { headers: { 'x-nextjs-action-not-found':'1' } }));
  await expect(deploymentAwareFetch(fetcher,'same',vi.fn())('/orders', action)).rejects.toThrow('تم تحديث الموقع');
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('fails closed if the version endpoint fails and leaves normal requests alone', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('',{status:503}));
  await expect(deploymentAwareFetch(fetcher,'same',vi.fn())('/orders',action)).rejects.toThrow('لم يُرسل');
  expect(fetcher).toHaveBeenCalledTimes(1);
  await deploymentAwareFetch(fetcher,'same',vi.fn())('/image.png'); expect(fetcher).toHaveBeenLastCalledWith('/image.png',undefined);
 });
});
