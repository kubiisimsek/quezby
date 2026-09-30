import { needsNewFaces, scriptOf, startIn, startedScript } from '@/i18n/script';

describe('the faces a launch is set in', () => {
  afterEach(() => startIn('tr'));

  it('names each language’s script', () => {
    expect(['tr', 'en', 'de', 'fr', 'es'].map((locale) => scriptOf(locale as 'tr'))).toEqual(
      Array(5).fill('latin'),
    );
    expect([scriptOf('ar'), scriptOf('ja'), scriptOf('ko')]).toEqual(['arabic', 'japanese', 'korean']);
  });

  it('starts in Latin until Boot says otherwise', () => {
    expect(startedScript()).toBe('latin');
    startIn('ko');
    expect(startedScript()).toBe('korean');
  });

  it('asks for new faces between Latin, Japanese and Korean', () => {
    expect(needsNewFaces('ja')).toBe(true);
    expect(needsNewFaces('fr')).toBe(false);

    startIn('ja');
    expect(needsNewFaces('ja')).toBe(false);
    expect(needsNewFaces('ko')).toBe(true);
    expect(needsNewFaces('de')).toBe(true);
  });

  it('leaves Arabic to the turn around, which reloads anyway', () => {
    expect(needsNewFaces('ar')).toBe(false);
    startIn('ar');
    expect(needsNewFaces('ja')).toBe(false);
  });
});
