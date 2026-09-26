import { currentScreen, recording, track, trackScreen } from '@/analytics/track';
import { openVisit } from '@/analytics/visit';
import { useSettings } from '@/stores/settings';
import { useVisits } from '@/stores/visits';

function recordingPhone() {
  useSettings.setState({ hydrated: true, analytics: true, consent: 'synced' });
  useVisits.setState({ hydrated: true, current: openVisit(Date.now(), null, '1.0.0') });
}

describe('track', () => {
  it('records a moment in the visit on show', () => {
    recordingPhone();

    track('share_result');

    expect(useVisits.getState().current?.counts).toEqual({ share_result: 1 });
  });

  it('records nothing without the player\'s yes', () => {
    recordingPhone();
    useSettings.setState({ analytics: false });

    track('share_result');
    trackScreen('Home');

    expect(recording()).toBe(false);
    expect(useVisits.getState().current?.journey).toEqual([]);
  });

  it('records nothing while the API asked for a pause', () => {
    recordingPhone();
    useVisits.setState({ pausedUntil: Date.now() + 60_000 });

    track('rival');

    expect(useVisits.getState().current?.counts).toEqual({});
  });

  it('records nothing before the visits are read back', () => {
    recordingPhone();
    useVisits.setState({ hydrated: false });

    track('rival');

    expect(useVisits.getState().current?.counts).toEqual({});
  });

  it('remembers the screen on show even when not recording, for the next visit to begin on', () => {
    trackScreen('League');
    expect(currentScreen()).toBe('league');

    recordingPhone();
    trackScreen('Daily');
    trackScreen('Tabs');

    expect(currentScreen()).toBe('daily');
    expect(useVisits.getState().current?.journey.map(([code]) => code)).toEqual(['daily']);
  });
});
