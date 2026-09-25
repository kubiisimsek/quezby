import type { AdminAuditAction, AdminAuditSubjectType, AdminAuditVia } from '@quezby/types';
import { ScrollText } from 'lucide-react';

import { Button } from '@/components/base/button';
import { Picker } from '@/components/base/picker';
import { DataTable } from '@/components/patterns/data-table';
import { FilterChips } from '@/components/patterns/filter-chips';
import { Page } from '@/components/patterns/page';
import { Pager } from '@/components/patterns/pager';
import { useAudit } from '@/hooks/api/audit';
import { useListParams } from '@/hooks/useListParams';
import { auditColumns } from '@/lib/columns';
import { AUDIT_ACTION, AUDIT_VIA } from '@/lib/format';
import { can } from '@/lib/permissions';
import { useSession } from '@/stores/session';

type ViaChip = 'all' | AdminAuditVia;
type ActionChoice = 'all' | AdminAuditAction;

const ACTIONS = Object.entries(AUDIT_ACTION) as [AdminAuditAction, { label: string }][];

/** Every moderation and admin action, whoever made it and however: the panel, the command line, the ops routes. */
export function AuditPage() {
  const role = useSession((state) => state.session?.admin.role);
  const { params, page, set, setPage } = useListParams({ action: 'all', via: 'all', subjectType: '', subjectId: '' });
  const action = params.action as ActionChoice;
  const via = params.via as ViaChip;
  const subject = params.subjectType && params.subjectId ? { type: params.subjectType as AdminAuditSubjectType, id: params.subjectId } : null;

  const audit = useAudit({
    action: action === 'all' ? undefined : action,
    via: via === 'all' ? undefined : via,
    subjectType: subject?.type,
    subjectId: subject?.id,
    page,
  });

  return (
    <Page
      title="Denetim kaydı"
      description="Panelden, komut satırından ya da ops ucundan yapılan her işlem: kim, neye, ne zaman ve neden. Kayıt silinmez, değiştirilemez."
    >
      <DataTable
        title={subject ? 'Tek bir kaydın geçmişi' : 'Bütün işlemler'}
        description="Yeniden eskiye"
        icon={<ScrollText />}
        columns={auditColumns(can(role, 'seeIps'))}
        rows={audit.data?.items ?? []}
        rowKey={(entry) => String(entry.id)}
        isLoading={audit.isPending}
        isFetching={audit.isFetching}
        error={audit.error}
        actions={
          subject ? (
            <Button size="sm" tone="ghost" onClick={() => set({ subjectType: '', subjectId: '' })}>
              Filtreyi kaldır
            </Button>
          ) : null
        }
        toolbar={
          <>
            <FilterChips<ViaChip>
              aria-label="Kanal"
              value={via}
              onChange={(value) => set({ via: value })}
              chips={[
                { value: 'all', label: 'Tümü' },
                ...(Object.entries(AUDIT_VIA) as [AdminAuditVia, string][]).map(([value, label]) => ({ value, label })),
              ]}
            />
            <div className="sm:ml-auto">
              <Picker<ActionChoice>
                compact
                aria-label="İşlem"
                value={action}
                onChange={(value) => set({ action: value })}
                options={[{ value: 'all', label: 'Bütün işlemler' }, ...ACTIONS.map(([value, { label }]) => ({ value, label }))]}
              />
            </div>
          </>
        }
        empty={
          action !== 'all' || via !== 'all' || subject
            ? { title: 'Bu filtrede kayıt yok', hint: 'Filtreleri kaldırıp bütün işlemlere dön.', icon: <ScrollText /> }
            : { title: 'Henüz kayıt yok', hint: 'İlk moderasyon işlemi ya da yönetici girişi burada görünür.', icon: <ScrollText /> }
        }
        footer={audit.data ? <Pager page={audit.data.page} perPage={audit.data.perPage} total={audit.data.total} onPage={setPage} noun="kayıt" /> : undefined}
      />
    </Page>
  );
}
