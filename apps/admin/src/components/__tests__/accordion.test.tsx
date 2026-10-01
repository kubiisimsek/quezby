import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Accordion } from '@/components/patterns/accordion';
import { renderWithProviders } from '@/test/render';

describe('Accordion', () => {
  it('opens and closes each section, saying what it holds while closed', async () => {
    const { user } = renderWithProviders(
      <Accordion
        defaultOpen={['b']}
        items={[
          { key: 'a', title: 'Lig', summary: 'Elmas', active: true, content: <p>Lig seçimi</p> },
          { key: 'b', title: 'Dil', summary: 'Fark etmez', content: <p>Dil seçimi</p> },
        ]}
      />,
    );

    const lig = screen.getByRole('button', { name: /Lig/ });
    expect(lig).toHaveAttribute('aria-expanded', 'false');
    expect(lig).toHaveTextContent('Elmas');
    expect(screen.getByText('Lig seçimi')).not.toBeVisible();
    expect(screen.getByRole('region', { name: /Dil/ })).toHaveTextContent('Dil seçimi');

    await user.click(lig);
    expect(lig).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Lig seçimi')).toBeVisible();
    await user.click(lig);
    expect(screen.getByText('Lig seçimi')).not.toBeVisible();
  });
});
