import type { AdminAccount, AdminRole } from '@quezby/types';
import { KeyRound, MoreHorizontal, Power, PowerOff, ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/base/avatar';
import { Button } from '@/components/base/button';
import { TextField } from '@/components/base/field';
import { Menu, type MenuItem } from '@/components/base/menu';
import { Modal } from '@/components/base/modal';
import { Panel } from '@/components/base/panel';
import { Segmented } from '@/components/base/segmented';
import { Tag } from '@/components/base/tag';
import { ConfirmModal } from '@/components/patterns/confirm-modal';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { FormModal } from '@/components/patterns/form-modal';
import { Page } from '@/components/patterns/page';
import { SecretReveal } from '@/components/patterns/secret-reveal';
import { useAdminActions, useAdmins } from '@/hooks/api/admins';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { When } from '@/lib/columns';
import { ADMIN_ROLE } from '@/lib/format';
import { useSession } from '@/stores/session';

const ROLES: AdminRole[] = ['viewer', 'moderator', 'owner'];

type Pending =
  | { kind: 'role'; admin: AdminAccount }
  | { kind: 'toggle'; admin: AdminAccount }
  | { kind: 'reset'; admin: AdminAccount }
  | null;

function RoleChoice({ value, onChange }: { value: AdminRole; onChange: (role: AdminRole) => void }) {
  return (
    <div className="space-y-2">
      <Segmented<AdminRole>
        kind="choice"
        aria-label="Rol"
        value={value}
        onChange={onChange}
        options={ROLES.map((role) => ({ value: role, label: ADMIN_ROLE[role].label }))}
      />
      <p className="text-meta text-ink-muted">{ADMIN_ROLE[value].hint}</p>
    </div>
  );
}

/** The panel's own accounts: who can sign in, with which role — owners only. */
export function AdminsPage() {
  const admins = useAdmins();
  const me = useSession((state) => state.session?.admin.id);
  const { create, update, resetPassword } = useAdminActions();
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState<AdminRole>('moderator');
  const [pending, setPending] = useState<Pending>(null);
  const [nextRole, setNextRole] = useState<AdminRole>('viewer');
  const [secret, setSecret] = useState<{ name: string; password: string } | null>(null);
  const createErrors = fieldErrors(create.error);

  const columns: Column<AdminAccount>[] = [
    {
      key: 'admin',
      header: 'Yönetici',
      cell: (admin) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={admin.name} tone={admin.disabledAt ? 'neutral' : 'primary'} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">
              {admin.name}
              {admin.id === me ? <span className="ml-1.5 text-micro font-medium text-ink-faint">(sen)</span> : null}
            </span>
            <span className="block truncate text-micro font-medium text-ink-faint">{admin.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'role', header: 'Rol', cell: (admin) => <Tag tone={ADMIN_ROLE[admin.role].tone} label={ADMIN_ROLE[admin.role].label} /> },
    {
      key: 'state',
      header: 'Durum',
      cell: (admin) =>
        admin.disabledAt ? (
          <Tag tone="neutral" label="Kapalı" />
        ) : admin.mustChangePassword ? (
          <Tag tone="warn" label="Şifre bekliyor" />
        ) : (
          <Tag tone="ok" label="Açık" />
        ),
    },
    { key: 'login', header: 'Son giriş', cell: (admin) => <When at={admin.lastLoginAt} />, tone: 'muted', hideBelow: 'md' },
    { key: 'added', header: 'Eklendi', cell: (admin) => <When at={admin.createdAt} as="date" />, tone: 'muted', hideBelow: 'lg' },
  ];

  const actions = (admin: AdminAccount) => {
    const self = admin.id === me;
    const items: MenuItem[] = [
      {
        label: 'Rolü değiştir',
        hint: self ? 'Kendi rolünü değiştiremezsin' : ADMIN_ROLE[admin.role].label,
        icon: <ShieldCheck />,
        disabled: self,
        onSelect: () => {
          setNextRole(admin.role);
          setPending({ kind: 'role', admin });
        },
      },
      {
        label: 'Şifreyi sıfırla',
        hint: self ? 'Kendi şifreni Hesabım’dan değiştir' : 'Geçici şifre verir',
        icon: <KeyRound />,
        disabled: self,
        onSelect: () => setPending({ kind: 'reset', admin }),
      },
      'separator',
      admin.disabledAt
        ? { label: 'Hesabı aç', hint: 'Yeniden girebilir', icon: <Power />, onSelect: () => setPending({ kind: 'toggle', admin }) }
        : {
            label: 'Hesabı kapat',
            hint: self ? 'Kendini kapatamazsın' : 'Oturumları da kapanır',
            icon: <PowerOff />,
            tone: 'danger',
            disabled: self,
            onSelect: () => setPending({ kind: 'toggle', admin }),
          },
    ];
    return <Menu label="Yönetici işlemleri" items={items} trigger={<Button tone="ghost" size="icon-sm" aria-label={`${admin.name} işlemleri`} icon={<MoreHorizontal />} />} />;
  };

  const done = (message: string) => {
    toast.success(message);
    setPending(null);
  };

  return (
    <Page
      title="Yöneticiler"
      description="Panele kim, hangi rolle girebilir. Yeni yöneticiye geçici bir şifre verilir; ilk girişte kendi şifresini seçer."
      actions={
        <Button tone="onBrand" icon={<UserPlus />} onClick={() => setAdding(true)}>
          Yönetici ekle
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <DataTable
          title="Hesaplar"
          icon={<UserCog />}
          columns={columns}
          rows={admins.data?.admins ?? []}
          rowKey={(admin) => admin.id}
          rowMuted={(admin) => admin.disabledAt !== null}
          rowActions={actions}
          isLoading={admins.isPending}
          error={admins.error}
          empty={{ title: 'Yönetici yok', icon: <UserCog /> }}
        />
        <Panel title="Roller" description="Her rol, altındakinin yaptığı her şeyi yapar." icon={<ShieldCheck />} tone="secondary" className="xl:self-start">
          <ul className="space-y-3">
            {[...ROLES].reverse().map((one) => (
              <li key={one} className="flex items-start gap-3">
                <Tag tone={ADMIN_ROLE[one].tone} label={ADMIN_ROLE[one].label} />
                <span className="text-meta text-ink-muted">{ADMIN_ROLE[one].hint}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <FormModal
        open={adding}
        onOpenChange={(open) => {
          if (!open) create.reset();
          setAdding(open);
        }}
        title="Yönetici ekle"
        description="Geçici bir şifre üretilir ve bir kez gösterilir."
        icon={<UserPlus />}
        submitLabel="Ekle"
        loading={create.isPending}
        error={create.error && Object.keys(createErrors).length === 0 ? errorMessage(create.error) : null}
        onSubmit={(data) =>
          create.mutate(
            { name: String(data.get('name') ?? '').trim(), email: String(data.get('email') ?? '').trim(), role },
            {
              onSuccess: (result) => {
                setAdding(false);
                setSecret({ name: result.admin.name, password: result.temporaryPassword });
              },
            },
          )
        }
      >
        <TextField label="Ad" name="name" required autoComplete="off" error={createErrors.name} />
        <TextField label="E-posta" name="email" type="email" required autoComplete="off" error={createErrors.email} />
        <div className="grid gap-1.5">
          <span className="text-micro text-ink-faint">Rol</span>
          <RoleChoice value={role} onChange={setRole} />
          {createErrors.role ? <p className="text-meta text-bad-text">{createErrors.role}</p> : null}
        </div>
      </FormModal>

      {pending?.kind === 'role' ? (
        <Modal
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={`${pending.admin.name} için rol`}
          icon={<ShieldCheck />}
          footer={
            <>
              <Button tone="ghost" onClick={() => setPending(null)}>
                Vazgeç
              </Button>
              <Button
                tone="primary"
                loading={update.isPending}
                onClick={() =>
                  update.mutate(
                    { id: pending.admin.id, changes: { role: nextRole } },
                    { onSuccess: () => done('Rol değişti'), onError: (error) => toast.error(errorMessage(error)) },
                  )
                }
              >
                Kaydet
              </Button>
            </>
          }
        >
          <RoleChoice value={nextRole} onChange={setNextRole} />
        </Modal>
      ) : null}

      {pending?.kind === 'toggle' ? (
        <ConfirmModal
          open
          onOpenChange={(open) => !open && setPending(null)}
          tone={pending.admin.disabledAt ? 'primary' : 'danger'}
          icon={pending.admin.disabledAt ? <Power /> : <PowerOff />}
          title={pending.admin.disabledAt ? `${pending.admin.name} hesabı açılsın mı?` : `${pending.admin.name} hesabı kapatılsın mı?`}
          description={
            pending.admin.disabledAt
              ? 'Yönetici yeniden panele girebilir.'
              : 'Yönetici panele bir daha giremez; açık oturumları hemen kapanır. Hesap sonra yeniden açılabilir.'
          }
          confirmLabel={pending.admin.disabledAt ? 'Hesabı aç' : 'Hesabı kapat'}
          loading={update.isPending}
          onConfirm={() =>
            update.mutate(
              { id: pending.admin.id, changes: { disabled: pending.admin.disabledAt === null } },
              {
                onSuccess: () => done(pending.admin.disabledAt ? 'Hesap açıldı' : 'Hesap kapatıldı'),
                onError: (error) => toast.error(errorMessage(error)),
              },
            )
          }
        />
      ) : null}

      {pending?.kind === 'reset' ? (
        <ConfirmModal
          open
          onOpenChange={(open) => !open && setPending(null)}
          icon={<KeyRound />}
          title={`${pending.admin.name} için yeni geçici şifre?`}
          description="Şu anki şifresi geçersiz olur ve açık oturumları kapanır. Yeni şifre bir kez gösterilir."
          confirmLabel="Şifreyi sıfırla"
          loading={resetPassword.isPending}
          onConfirm={() =>
            resetPassword.mutate(pending.admin.id, {
              onSuccess: (result) => {
                setPending(null);
                setSecret({ name: result.admin.name, password: result.temporaryPassword });
              },
              onError: (error) => toast.error(errorMessage(error)),
            })
          }
        />
      ) : null}

      {secret ? (
        <SecretReveal
          open
          onClose={() => setSecret(null)}
          title={`${secret.name} için geçici şifre`}
          description="Panele bu şifreyle ilk kez girecek."
          secret={secret.password}
        />
      ) : null}
    </Page>
  );
}
