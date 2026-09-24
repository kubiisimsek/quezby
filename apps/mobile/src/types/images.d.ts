/**
 * Bitmaps Metro bundles (`@2x` / `@3x` picked per screen). A default import
 * is the asset's `ImageSourcePropType`; only `ui/brand-mark.tsx` uses one.
 */
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';

  const source: ImageSourcePropType;
  export default source;
}
