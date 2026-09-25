import { ArrowRight, AtSign } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/base/button';
import { Checkbox } from '@/components/base/checkbox';
import { PasswordField, TextField } from '@/components/base/field';
import { LoginLayout } from '@/components/layout/login-layout';
import { Callout } from '@/components/patterns/callout';
import { useLogin } from '@/hooks/api/me';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { useSession } from '@/stores/session';

/** Where the panel starts: an email and a password, and nothing else. */
export function LoginPage() {
  const session = useSession((state) => state.session);
  const ended = useSession((state) => state.ended);
  const signIn = useSession((state) => state.signIn);
  const login = useLogin();
  const location = useLocation();
  const navigate = useNavigate();
  const [remember, setRemember] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';
  if (session) return <Navigate to={from} replace />;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    login.mutate(
      { email: String(data.get('email') ?? '').trim(), password: String(data.get('password') ?? '') },
      {
        onSuccess: (result) => {
          signIn(result, remember);
          toast.success(`Hoş geldin, ${result.admin.name}`);
          navigate(result.admin.mustChangePassword ? '/account' : from, { replace: true });
        },
      },
    );
  };

  const fields = fieldErrors(login.error);
  const failure = login.error && Object.keys(fields).length === 0 ? errorMessage(login.error) : null;

  return (
    <LoginLayout title="Giriş yap" description="Quezby yönetim paneline yönetici hesabınla gir.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {ended === 'expired' && !login.error ? (
          <Callout tone="info">Oturumun sona erdi. Devam etmek için yeniden giriş yap.</Callout>
        ) : null}
        {failure ? <Callout tone="bad">{failure}</Callout> : null}
        <TextField
          label="E-posta"
          name="email"
          type="email"
          autoComplete="username"
          icon={<AtSign />}
          required
          autoFocus
          error={fields.email}
        />
        <PasswordField label="Şifre" name="password" autoComplete="current-password" required error={fields.password} />
        <Checkbox
          label="Beni hatırla"
          hint="Tarayıcıyı kapatsan da oturum en fazla 12 saat açık kalır. Ortak bilgisayarda seçme."
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
        />
        <Button
          type="submit"
          tone="primary"
          size="lg"
          className="group w-full"
          loading={login.isPending}
        >
          Giriş yap
          <ArrowRight aria-hidden className="transition-transform duration-200 ease-snap group-hover:translate-x-0.5" />
        </Button>
      </form>
    </LoginLayout>
  );
}
