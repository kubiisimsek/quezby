import {
  cloudProjectNumber,
  environmentFrom,
  hostOfScriptUrl,
  localApiUrl,
} from '@/config/environment';
import { formatDuration, formatPerMille, formatRank, formatScore } from '@/lib/format';

describe('environment', () => {
  it('reads the environment QUEZBY_ENV names', () => {
    expect(environmentFrom('local')).toBe('local');
    expect(environmentFrom('staging')).toBe('staging');
    expect(environmentFrom(' production ')).toBe('production');
  });

  it('is local whenever QUEZBY_ENV names nothing it knows — never production by accident', () => {
    expect(environmentFrom(undefined)).toBe('local');
    expect(environmentFrom(null)).toBe('local');
    expect(environmentFrom('')).toBe('local');
    expect(environmentFrom('prod')).toBe('local');
    expect(environmentFrom('Production')).toBe('local');
  });

  it('takes a Cloud project number only when it is one', () => {
    expect(cloudProjectNumber('123456789012')).toBe('123456789012');
    expect(cloudProjectNumber(' 123456789012 ')).toBe('123456789012');
    expect(cloudProjectNumber('')).toBeNull();
    expect(cloudProjectNumber(undefined)).toBeNull();
    expect(cloudProjectNumber('quezby-prod')).toBeNull();
  });

  it('finds the Metro host in the bundle URL', () => {
    expect(hostOfScriptUrl('http://192.168.1.20:8081/index.bundle?platform=ios')).toBe(
      '192.168.1.20',
    );
    expect(hostOfScriptUrl(null)).toBeNull();
  });

  it('points a local build on a device at the Mac that served the bundle', () => {
    expect(localApiUrl('http://localhost:8000', '192.168.1.20', 'ios')).toBe(
      'http://192.168.1.20:8000',
    );
    expect(localApiUrl('http://localhost:8000/', 'localhost', 'ios')).toBe(
      'http://localhost:8000',
    );
    expect(localApiUrl('http://127.0.0.1:8000', null, 'android')).toBe(
      'http://10.0.2.2:8000',
    );
    expect(localApiUrl('https://dev.example.com', '192.168.1.20', 'ios')).toBe(
      'https://dev.example.com',
    );
  });
});

describe('format', () => {
  it('groups digits the Turkish way', () => {
    expect(formatScore(0)).toBe('0');
    expect(formatScore(1234567)).toBe('1.234.567');
  });

  it('writes durations, shares and ranks', () => {
    expect(formatDuration(154_000)).toBe('2:34');
    expect(formatPerMille(942)).toBe('%94,2');
    expect(formatRank(null)).toBe('—');
    expect(formatRank(1204)).toBe('#1.204');
  });
});
