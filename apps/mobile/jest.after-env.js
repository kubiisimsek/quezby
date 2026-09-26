/**
 * Runs once the test framework is installed (`setupFilesAfterEnv`).
 *
 * The app-wide query cache (`rememberMe` writes to it) keeps a garbage
 * collection timer per entry; empty it after every test so no worker is
 * left waiting on one. The settings and the recorded visits are module
 * state too: every test starts from a phone that was never asked.
 */
afterEach(() => {
  require('./src/api/queryClient').queryClient.clear();
});

// Before, not after: a screen still mounted would re-render outside `act`.
beforeEach(() => {
  require('./src/stores/settings').useSettings.setState({
    haptics: true,
    analytics: false,
    consent: 'unasked',
    hydrated: false,
  });
  require('./src/stores/visits').useVisits.setState({
    current: null,
    outbox: [],
    pausedUntil: 0,
    nextTryAt: 0,
    hydrated: false,
  });
});
