import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/base/button';
import { PasswordField } from '@/components/base/field';
import { Panel } from '@/components/base/panel';
import { Tag } from '@/components/base/tag';
import { Callout } from '@/components/patterns/callout';
import { Facts } from '@/components/patterns/facts';
import { Page } from '@/components/patterns/page';
import { useChangePassword } from '@/hooks/api/me';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { ADMIN_ROLE, formatDateTime } from '@/lib/format';
import { useSession } from '@/stores/session';

/** The signed-in admin's own account — and, on a temporary password, the one page that opens. */
export function AccountPage() {
  const session = useSession((state) => state.session);
  const update = useSession((state) => state.update);
  const change = useChangePassword();
  const navigate = useNavigate();
  const [formKey, setFormKey] = useState(0);

  if (!session) return null;
  const { admin } = session;
  const first = admin.mustChangePassword;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    change.mutate(
      {
        currentPassword: String(data.get('currentPassword') ?? ''),
        password: String(data.get('password') ?? ''),
        passwordConfirmation: String(data.get('passwordConfirmation') ?? ''),
      },
      {
        onSuccess: () => {
          update({ ...admin, mustChangePassword: false });
          setFormKey((key) => key + 1);
          toast.success('Şifren değişti', { description: 'Başka cihazlardaki oturumların kapandı.' });
          if (first) navigate('/', { replace: true });
        },
      },
    );
  };

  const fields = fieldErrors(change.error);
  const failure = change.error && Object.keys(fields).length === 0 ? errorMessage(change.error) : null;

  return (
    <Page
      title="Hesabım"
      description="Panele hangi hesapla girdiğin ve şifren."
      eyebrow={<Tag tone="onBrand" icon={<ShieldCheck />} label={ADMIN_ROLE[admin.role].label} />}
    >
      {first ? (
        <Callout tone="warn" title="Önce kendi şifreni belirle">
          <p>Geçici bir şifreyle girdin. Kendi şifreni seçene kadar panelin geri kalanı kapalı.</p>
        </Callout>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel title="Şifreni değiştir" description="En az 12 karakter. Değişince diğer oturumların kapanır." icon={<KeyRound />}>
          <form key={formKey} onSubmit={submit} className="max-w-md space-y-4" noValidate>
            {failure ? <Callout tone="bad">{failure}</Callout> : null}
            <PasswordField
              label={first ? 'Geçici şifre' : 'Şu anki şifre'}
              name="currentPassword"
              autoComplete="current-password"
              required
              error={fields.currentPassword}
            />
            <PasswordField label="Yeni şifre" name="password" autoComplete="new-password" required error={fields.password} />
            <PasswordField
              label="Yeni şifre (tekrar)"
              name="passwordConfirmation"
              autoComplete="new-password"
              required
              error={fields.passwordConfirmation}
            />
            <Button type="submit" tone="primary" loading={change.isPending}>
              Şifreyi değiştir
            </Button>
          </form>
        </Panel>

        <Panel title="Hesap" icon={<UserRound />} tone="secondary">
          <Facts
            facts={[
              { label: 'Ad', value: admin.name },
              { label: 'E-posta', value: admin.email },
              { label: 'Rol', value: ADMIN_ROLE[admin.role].label, hint: ADMIN_ROLE[admin.role].hint },
              { label: 'Son giriş', value: formatDateTime(admin.lastLoginAt) },
              { label: 'Oturum bitişi', value: formatDateTime(session.expiresAt) },
            ]}
          />
        </Panel>
      </div>
    </Page>
  );
}
