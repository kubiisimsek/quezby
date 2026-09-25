import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/base/button';
import { EmptyState } from '@/components/patterns/empty-state';
import { Page } from '@/components/patterns/page';

export function NotFoundPage() {
  return (
    <Page title="Sayfa bulunamadı" description="Bu adreste bir sayfa yok.">
      <div className="rounded-panel bg-raised shadow-card">
        <EmptyState
          icon={<Compass />}
          title="Burada bir şey yok"
          hint="Adres yanlış yazılmış ya da sayfa taşınmış olabilir. Menüden devam et."
          action={
            <Button asChild tone="neutral">
              <Link to="/">Genel bakışa dön</Link>
            </Button>
          }
        />
      </div>
    </Page>
  );
}
