import { Image, useColorScheme } from 'react-native';

/** Approved WAKA artwork, selected with the same system theme as the app. */
export function BrandLogo({ size = 64 }: { size?: number }) {
  const dark = useColorScheme() === 'dark';
  return <Image
    accessibilityLabel="Wakà logo"
    source={dark ? require('../../assets/branding/waka-dark.png') : require('../../assets/branding/waka-light.png')}
    resizeMode="contain"
    style={{ width: size, height: size }}
  />;
}
