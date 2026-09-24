/**
 * Runs once the test framework is installed (`setupFilesAfterEnv`).
 *
 * The app-wide query cache (`rememberMe` writes to it) keeps a garbage
 * collection timer per entry; empty it after every test so no worker is
 * left waiting on one.
 */
afterEach(() => {
  require('./src/api/queryClient').queryClient.clear();
});
