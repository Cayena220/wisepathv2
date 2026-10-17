import {
  computeRegistrationStatus,
  formatManila,
  manilaLocalToMillis,
  millisToManilaLocal,
  timeAgo,
} from '@wisepath/shared';
import { CalendarClock, CalendarX2, Info, Lock, Save, ShieldCheck, Smartphone } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { useActor } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/data/display';
import { RegistrationPill } from '@/components/data/RegistrationPill';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/overlays';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Skeleton, Textarea } from '@/components/ui/primitives';
import { saveRegistration, useRegistrationSettings } from '@/lib/data/accounts';
import { useAuditLog } from '@/lib/data/results';
import { errorMessage } from '@/lib/utils';

const DEFAULT_MESSAGE = 'Registration for this school year is closed. Visit the admissions office if you still need an account.';

export function RegistrationPage() {
  const actor = useActor();
  const { data: settings, isLoading } = useRegistrationSettings();
  const history = useAuditLog({ departmentId: null, isSuperAdmin: true, action: 'registration.update', max: 15 });
  const [enabled, setEnabled] = React.useState(true);
  const [opensAt, setOpensAt] = React.useState('');
  const [closesAt, setClosesAt] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const loaded = React.useRef(false);

  React.useEffect(() => {
    if (settings === undefined || loaded.current) return;
    loaded.current = true;
    setEnabled(settings?.enabled ?? true);
    setOpensAt(millisToManilaLocal(settings?.opensAt?.toMillis() ?? null));
    setClosesAt(millisToManilaLocal(settings?.closesAt?.toMillis() ?? null));
    setMessage(settings?.closedMessage ?? '');
  }, [settings]);

  const opensMs = opensAt ? manilaLocalToMillis(opensAt) : null;
  const closesMs = closesAt ? manilaLocalToMillis(closesAt) : null;
  const orderError = opensMs != null && closesMs != null && opensMs >= closesMs ? 'The closing time must be after the opening time.' : null;
  const preview = computeRegistrationStatus({ enabled, opensAt: opensMs, closesAt: closesMs });

  const save = async (override?: Partial<{ enabled: boolean; closesAt: number | null }>) => {
    if (orderError && !override) return;
    setBusy(true);
    try {
      const next = {
        enabled: override?.enabled ?? enabled,
        opensAt: opensMs,
        closesAt: override && 'closesAt' in override ? override.closesAt ?? null : closesMs,
        closedMessage: message || null,
      };
      if (next.opensAt != null && next.closesAt != null && next.opensAt >= next.closesAt) next.opensAt = null;
      await saveRegistration(actor, next, settings ?? null);
      setEnabled(next.enabled);
      setOpensAt(millisToManilaLocal(next.opensAt));
      setClosesAt(millisToManilaLocal(next.closesAt));
      toast.success('Registration settings saved');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Student registration"
        description="Decide when students can create WisePath accounts on Android. Close it after enrollment so no one can sign up late. Changes apply instantly and are enforced by the server, not the phone."
        actions={isLoading ? <Skeleton className="h-8 w-44" /> : <RegistrationPill settings={settings} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Registration window</CardTitle>
            <CardDescription>All times are Philippine time (Asia/Manila, UTC+8).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-surface/50 p-4">
              <div>
                <div className="font-semibold text-navy-900">Accept new student registrations</div>
                <div className="text-[13px] text-navy-600">Turn off to close registration immediately, whatever the schedule says.</div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Accept new student registrations" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Opens at" htmlFor="opens" hint="Leave empty to open right away.">
                <Input id="opens" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
              </Field>
              <Field label="Closes at (end of enrollment)" htmlFor="closes" hint="Leave empty to keep it open." error={orderError ?? undefined}>
                <Input id="closes" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
              </Field>
            </div>

            <Field label="Message shown when registration is closed" htmlFor="msg">
              <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={DEFAULT_MESSAGE} rows={3} maxLength={500} />
            </Field>

            <div className="rounded-xl border border-teal-600/20 bg-teal-50/70 p-4 text-[13px] text-navy-900">
              <div className="flex items-center gap-2 font-semibold">
                <Info className="size-4 text-teal-700" /> With these settings
              </div>
              <p className="mt-1 text-navy-700">
                {preview.state === 'closed' && 'Registration is closed. New students cannot create an account.'}
                {preview.state === 'scheduled' && `Registration is closed until ${formatManila(preview.opensAt)}, then opens automatically.`}
                {preview.state === 'ended' && `The enrollment period ended ${formatManila(preview.closesAt)}. New students cannot create an account.`}
                {preview.state === 'open' &&
                  (preview.closesAt ? `Students can register until ${formatManila(preview.closesAt)}; it then closes automatically.` : 'Students can register now. No closing time is scheduled.')}{' '}
                Students who already have an account can always sign in.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void save()} loading={busy} disabled={Boolean(orderError)}>
                <Save /> Save settings
              </Button>
              <Button variant="destructive-outline" onClick={() => void save({ enabled: false })} disabled={busy}>
                <Lock /> Close now
              </Button>
              <Button
                variant="outline"
                disabled={busy || !closesAt}
                onClick={() => void save({ enabled: true, closesAt: closesMs })}
                title="Keep registration on, closing automatically at the time above"
              >
                <CalendarClock /> Close at end of enrollment
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 font-semibold text-navy-900">
              <ShieldCheck className="size-4 text-gold-700" /> Why it can’t be tampered with
            </div>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-navy-700">
              <li className="flex gap-2">
                <Smartphone className="mt-0.5 size-4 shrink-0 text-navy-400" />
                The Android app shows the closed message, but the real check runs in Firestore security rules using the server’s clock — changing a phone’s date does nothing.
              </li>
              <li className="flex gap-2">
                <CalendarX2 className="mt-0.5 size-4 shrink-0 text-navy-400" />
                Only you (the Super Admin) can change these settings. Department admins cannot.
              </li>
            </ul>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Change history</CardTitle>
            </CardHeader>
            <ul className="divide-y text-[13px]">
              {(history.data ?? []).map((log) => {
                const d = log.details as { enabled?: boolean; opensAt?: number | null; closesAt?: number | null };
                return (
                  <li key={log.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-navy-900">{d.enabled ? 'Enabled' : 'Disabled'}</span>
                      <span className="text-xs text-navy-400">{timeAgo(log.createdAt)}</span>
                    </div>
                    <div className="text-xs text-navy-600">
                      {d.opensAt ? `Opens ${formatManila(d.opensAt)} · ` : ''}
                      {d.closesAt ? `Closes ${formatManila(d.closesAt)}` : 'No closing time'} · by {log.actorName}
                    </div>
                  </li>
                );
              })}
              {!history.isLoading && !history.data?.length && <li className="px-5 py-4 text-navy-600">No changes yet.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
