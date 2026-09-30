import { trigger } from 'react-native-haptic-feedback';

import { feel } from '@/lib/haptics';
import { useSettings } from '@/stores/settings';

describe('feel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettings.setState({ haptics: true });
  });

  it('buzzes as a new league lands, and warns on a fall', () => {
    feel('rankUp');
    feel('rankDown');

    expect(jest.mocked(trigger).mock.calls.map(([pattern]) => pattern)).toEqual([
      'notificationSuccess',
      'notificationWarning',
    ]);
  });

  it('stays still when the player turned vibration off', () => {
    useSettings.setState({ haptics: false });
    feel('rankUp');

    expect(trigger).not.toHaveBeenCalled();
  });
});
