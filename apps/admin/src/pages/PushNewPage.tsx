import type { AdminPushMessage, Locale } from '@quezby/types';
import {
  CalendarDays,
  Check,
  Eye,
  Gamepad2,
  Gauge,
  Languages,
  PenLine,
  Send,
  Smartphone,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/base/button';
import { Checkbox } from '@/components/base/checkbox';
import { Field } from '@/components/base/field';
import { Modal } from '@/components/base/modal';
import { Panel } from '@/components/base/panel';
import { Picker } from '@/components/base/picker';
import { Segmented } from '@/components/base/segmented';
import { Tag } from '@/components/base/tag';
import { TextArea } from '@/components/base/text-area';
import { TextInput } from '@/components/base/text-input';
import { Accordion } from '@/components/patterns/accordion';
import { Callout } from '@/components/patterns/callout';
import { Facts } from '@/components/patterns/facts';
import { Page } from '@/components/patterns/page';
import { NotificationPreview } from '@/components/push/notification-preview';
import { usePushActions, usePushAudience } from '@/hooks/api/push';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { formatNumber, LEAGUE_TIER, LEAGUE_TIERS, LOCALE_LABEL } from '@/lib/format';
import {
  type AccountChoice,
  type Choices,
  type DailyChoice,
  describeFilters,
  filtersOf,
  JOINED_OPTIONS,
  type JoinedChoice,
  LOCALES,
  NO_CHOICE,
  NO_WORDS,
  PLAYED_OPTIONS,
  type PlayedChoice,
  type PlatformChoice,
  tiersInWords,
  toggle,
  untitledOf,
  type Words,
  writtenOf,
} from '@/lib/push';

const DAILY_LABEL: Record<DailyChoice, string> = { any: 'Fark etmez', played: 'Bugün oynadı', not_played: 'Bugün oynamadı' };
const PLATFORM_LABEL: Record<PlatformChoice, string> = { any: 'Hepsi', ios: 'iOS', android: 'Android' };
const ACCOUNT_LABEL: Record<AccountChoice, string> = { any: 'Hepsi', registered: 'Kayıtlı', guest: 'Misafir' };

/** The words in one language: a large title, the message, and how they look on a lock screen. */
function Composer({ words, language, onChange, errors }: { words: Words; language: Locale; onChange: (change: Partial<AdminPushMessage>) => void; errors: Record<string, string> }) {
  const current = words[language];
  const titleError = errors[`messages.${language}.title`];
  const bodyError = errors[`messages.${language}.body`];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 space-y-4">
        <Field label="Başlık" hint={`${current.title.length} / 60`} error={titleError}>
          {(control) => (
            <TextInput
              {...control}
              value={current.title}
              onChange={(event) => onChange({ title: event.target.value })}
              maxLength={60}
              dir="auto"
              invalid={Boolean(titleError)}
              wellClassName="h-14"
              className="text-heading"
            />
          )}
        </Field>
        <Field label="Mesaj" hint={`${current.body.length} / 240`} error={bodyError}>
          {(control) => (
            <TextArea
              {...control}
              value={current.body}
              onChange={(event) => onChange({ body: event.target.value })}
              maxLength={240}
              dir="auto"
              invalid={Boolean(bodyError)}
              placeholder={`${LOCALE_LABEL[language]} metni — ör. Bugünün akışı seni bekliyor!`}
              className="min-h-36 text-heading font-medium"
            />
          )}
        </Field>
      </div>
      <NotificationPreview message={current} className="hidden lg:block" />
    </div>
  );
}

/**
 * A new push: the words first — in every language worth writing — then who
 * they go to, section by section, with the count of players and phones kept
 * beside. Sending shows the push as players will see it before it goes.
 */
export function PushNewPage() {
  const navigate = useNavigate();
  const [choices, setChoices] = useState<Choices>(NO_CHOICE);
  const [words, setWords] = useState<Words>(NO_WORDS);
  const [language, setLanguage] = useState<Locale>('tr');
  const [chosenFallback, setFallback] = useState<Locale>('tr');
  const [previewing, setPreviewing] = useState(false);
  const [previewLanguage, setPreviewLanguage] = useState<Locale>('tr');
  const set = (change: Partial<Choices>) => setChoices((current) => ({ ...current, ...change }));

  const filters = useMemo(() => filtersOf(choices), [choices]);
  const settled = useDebouncedValue(filters, 300);
  const audience = usePushAudience(settled);
  const { send } = usePushActions();
  const fields = fieldErrors(send.error);
  const count = audience.data;

  const written = writtenOf(words);
  const untitled = untitledOf(words);
  const fallback = written.includes(chosenFallback) ? chosenFallback : written[0];
  const elsewhere = count ? LOCALES.filter((locale) => !written.includes(locale)).reduce((sum, locale) => sum + (count.locales[locale] ?? 0), 0) : 0;
  const active = Object.keys(filters).length;
  const ready = written.length > 0 && fallback !== undefined && (count?.devices ?? 0) > 0;

  const write = (change: Partial<AdminPushMessage>) => setWords((all) => ({ ...all, [language]: { ...all[language], ...change } }));

  const openPreview = () => {
    setPreviewLanguage(written.includes(language) ? language : (fallback ?? 'tr'));
    setPreviewing(true);
  };

  const submit = () => {
    if (!fallback) return;
    const messages = Object.fromEntries(written.map((locale) => [locale, { title: words[locale].title.trim(), body: words[locale].body.trim() }]));
    send.mutate(
      { messages, fallback, filters },
      {
        onSuccess: ({ campaign }) => {
          setPreviewing(false);
          toast.success(campaign.devices === 0 ? 'Gönderilecek cihaz yok' : `${formatNumber(campaign.devices)} cihaza gidiyor`);
          navigate('/push');
        },
        onError: () => setPreviewing(false),
      },
    );
  };

  return (
    <Page
      title="Yeni bildirim"
      back={{ to: '/push', label: 'Push bildirimleri' }}
      description="Önce mesajı yaz — her dilde ayrı. Sonra kime gideceğini seç; göndermeden önce oyuncunun göreceği hâliyle önizle."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <Panel
            title="Mesaj"
            description="Her oyuncu hesabının dilindeki metni alır. Yazılmayan dillere seçtiğin yedek dil gider."
            icon={<PenLine />}
            toolbar={
              <Segmented<Locale>
                aria-label="Dil"
                value={language}
                onChange={setLanguage}
                options={LOCALES.map((locale) => ({
                  value: locale,
                  label: locale.toUpperCase(),
                  icon: written.includes(locale) ? <Check /> : undefined,
                  'aria-label': `${LOCALE_LABEL[locale]}${written.includes(locale) ? ', yazıldı' : ''}`,
                }))}
              />
            }
          >
            {send.error && Object.keys(fields).length === 0 ? (
              <Callout tone="bad" className="mb-4">
                {errorMessage(send.error)}
              </Callout>
            ) : null}
            <p className="mb-4 text-meta text-ink-muted">
              <span className="font-semibold text-ink">{LOCALE_LABEL[language]}</span> · bu dilde {formatNumber(count?.locales[language] ?? 0)} cihaz
            </p>
            <Composer words={words} language={language} onChange={write} errors={fields} />
          </Panel>

          <Panel
            title="Kime"
            description="Her filtre listeyi daraltır. Yasaklı oyuncular hiç seçilmez."
            icon={<Users />}
            tone="secondary"
            actions={
              active > 0 ? (
                <div className="flex items-center gap-2">
                  <Tag tone="secondary" label={`${active} filtre`} />
                  <Button size="sm" tone="ghost" onClick={() => setChoices(NO_CHOICE)}>
                    Temizle
                  </Button>
                </div>
              ) : null
            }
          >
            <Accordion
              items={[
                {
                  key: 'player',
                  title: 'Tek oyuncu',
                  icon: <UserRound />,
                  summary: choices.username.trim() ? `@${choices.username.trim().replace(/^@/, '')}` : 'Herkes',
                  active: choices.username.trim() !== '',
                  content: (
                    <TextInput
                      aria-label="Oyuncu adı"
                      placeholder="@kullanıcı"
                      value={choices.username}
                      onChange={(event) => set({ username: event.target.value })}
                      maxLength={33}
                    />
                  ),
                },
                {
                  key: 'tiers',
                  title: 'Lig (Dereceli)',
                  icon: <Gauge />,
                  summary: choices.tiers.length > 0 ? tiersInWords(choices.tiers) : 'Fark etmez',
                  active: choices.tiers.length > 0,
                  content: (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {[...LEAGUE_TIERS, 'none' as const].map((tier) => (
                        <Checkbox
                          key={tier}
                          label={tier === 'none' ? 'Ligi yok' : LEAGUE_TIER[tier]}
                          checked={choices.tiers.includes(tier)}
                          onChange={() => set({ tiers: toggle(choices.tiers, tier) })}
                        />
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'daily',
                  title: 'Bugünkü Günün akışı',
                  icon: <CalendarDays />,
                  summary: DAILY_LABEL[choices.daily],
                  active: choices.daily !== 'any',
                  content: (
                    <Segmented<DailyChoice>
                      kind="choice"
                      aria-label="Bugünkü Günün akışı"
                      value={choices.daily}
                      onChange={(daily) => set({ daily })}
                      options={[
                        { value: 'any', label: 'Fark etmez' },
                        { value: 'played', label: 'Oynadı' },
                        { value: 'not_played', label: 'Oynamadı' },
                      ]}
                    />
                  ),
                },
                {
                  key: 'played',
                  title: 'Son oyun',
                  icon: <Gamepad2 />,
                  summary: PLAYED_OPTIONS.find((option) => option.value === choices.played)?.label,
                  active: choices.played !== 'any',
                  content: <Picker<PlayedChoice> aria-label="Son oyun" value={choices.played} onChange={(played) => set({ played })} options={PLAYED_OPTIONS} />,
                },
                {
                  key: 'joined',
                  title: 'Katılım',
                  icon: <UserPlus />,
                  summary: JOINED_OPTIONS.find((option) => option.value === choices.joined)?.label,
                  active: choices.joined !== 'any',
                  content: <Picker<JoinedChoice> aria-label="Katılım" value={choices.joined} onChange={(joined) => set({ joined })} options={JOINED_OPTIONS} />,
                },
                {
                  key: 'platform',
                  title: 'Telefon',
                  icon: <Smartphone />,
                  summary: PLATFORM_LABEL[choices.platform],
                  active: choices.platform !== 'any',
                  content: (
                    <Segmented<PlatformChoice>
                      kind="choice"
                      aria-label="Telefon"
                      value={choices.platform}
                      onChange={(platform) => set({ platform })}
                      options={(['any', 'ios', 'android'] as const).map((value) => ({ value, label: PLATFORM_LABEL[value] }))}
                    />
                  ),
                },
                {
                  key: 'locales',
                  title: 'Dil',
                  icon: <Languages />,
                  summary: choices.locales.length > 0 ? choices.locales.map((locale) => LOCALE_LABEL[locale]).join(', ') : 'Fark etmez',
                  active: choices.locales.length > 0,
                  content: (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {LOCALES.map((locale) => (
                        <Checkbox
                          key={locale}
                          label={LOCALE_LABEL[locale]}
                          checked={choices.locales.includes(locale)}
                          onChange={() => set({ locales: toggle(choices.locales, locale) })}
                        />
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'account',
                  title: 'Hesap',
                  icon: <UserRound />,
                  summary: ACCOUNT_LABEL[choices.account],
                  active: choices.account !== 'any',
                  content: (
                    <Segmented<AccountChoice>
                      kind="choice"
                      aria-label="Hesap"
                      value={choices.account}
                      onChange={(account) => set({ account })}
                      options={(['any', 'registered', 'guest'] as const).map((value) => ({ value, label: ACCOUNT_LABEL[value] }))}
                    />
                  ),
                },
              ]}
            />
          </Panel>
        </div>

        <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <Panel title="Alıcılar" description={describeFilters(settled)} icon={<Send />}>
            {audience.error ? (
              <Callout tone="bad">{errorMessage(audience.error)}</Callout>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-display text-ink tabular">{count ? formatNumber(count.reachable) : '…'}</p>
                  <p className="text-meta text-ink-muted">
                    oyuncu · <span className="font-semibold text-ink">{count ? formatNumber(count.devices) : '…'}</span> cihaz
                  </p>
                </div>
                <Facts
                  facts={[
                    { label: 'Filtreye uyan', value: count ? formatNumber(count.players) : '…', hint: 'Bildirime izin vermeyenler dahil.' },
                    { label: 'iOS', value: count ? formatNumber(count.ios) : '…' },
                    { label: 'Android', value: count ? formatNumber(count.android) : '…' },
                  ]}
                />
                <div>
                  <p className="mb-2 text-micro text-ink-faint">Dillere göre cihaz</p>
                  <ul aria-label="Dillere göre cihaz" className="flex flex-wrap gap-1.5">
                    {LOCALES.filter((locale) => (count?.locales[locale] ?? 0) > 0).map((locale) => (
                      <li key={locale}>
                        <Tag
                          tone={written.includes(locale) ? 'ok' : 'neutral'}
                          icon={written.includes(locale) ? <Check /> : undefined}
                          label={`${locale.toUpperCase()} ${formatNumber(count?.locales[locale] ?? 0)}`}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
                {written.length > 0 && fallback ? (
                  <Field label="Çevirisi olmayanlara" hint={`Yazılmamış dillerdeki ${formatNumber(elsewhere)} cihaz bu dili alır.`}>
                    {() => (
                      <Picker<Locale>
                        aria-label="Çevirisi olmayanlara"
                        value={fallback}
                        onChange={setFallback}
                        options={written.map((locale) => ({ value: locale, label: LOCALE_LABEL[locale] }))}
                      />
                    )}
                  </Field>
                ) : null}
                {untitled.length > 0 ? (
                  <Callout tone="warn">{untitled.map((locale) => LOCALE_LABEL[locale]).join(', ')}: başlık boş; bu dil gönderilmez.</Callout>
                ) : null}
                <Button tone="primary" size="lg" icon={<Eye />} className="w-full" disabled={!ready} onClick={openPreview}>
                  Önizle ve gönder
                </Button>
                {written.length === 0 ? <p className="text-center text-meta text-ink-muted">Göndermek için en az bir dilde mesaj yaz.</p> : null}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <Modal
        open={previewing}
        onOpenChange={(open) => !send.isPending && setPreviewing(open)}
        title="Gönderilmeden önce"
        description="Oyuncular bildirimi kilit ekranında böyle görecek."
        icon={<Eye />}
        size="md"
        footer={
          <>
            <Button tone="ghost" onClick={() => setPreviewing(false)} disabled={send.isPending}>
              Vazgeç
            </Button>
            <Button tone="primary" icon={<Send />} loading={send.isPending} onClick={submit}>
              {`${formatNumber(count?.devices ?? 0)} cihaza gönder`}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {written.length > 1 ? (
            <Segmented<Locale>
              kind="choice"
              aria-label="Önizleme dili"
              value={previewLanguage}
              onChange={setPreviewLanguage}
              options={written.map((locale) => ({ value: locale, label: `${LOCALE_LABEL[locale]} · ${formatNumber(count?.locales[locale] ?? 0)}` }))}
            />
          ) : null}
          <NotificationPreview message={words[previewLanguage]} />
          <Facts
            facts={[
              { label: 'Kime', value: describeFilters(filters) },
              { label: 'Alıcı', value: `${formatNumber(count?.reachable ?? 0)} oyuncu · ${formatNumber(count?.devices ?? 0)} cihaz` },
              { label: 'Diller', value: written.map((locale) => LOCALE_LABEL[locale]).join(', ') },
              { label: 'Diğer diller', value: fallback ? `${LOCALE_LABEL[fallback]} alır · ${formatNumber(elsewhere)} cihaz` : '—' },
            ]}
          />
          <p className="text-meta text-ink-muted">Gönderilen bildirim geri alınamaz; denetim kaydına yazılır.</p>
        </div>
      </Modal>
    </Page>
  );
}
