import { Text, TextInput, type StyleProp, type TextStyle } from 'react-native';

import { fontFamilies } from './tokens';

let defaultsInstalled = false;

/** Applies the regular Nunito Sans face to legacy raw text and text inputs. */
export function installTypographyDefaults() {
  if (defaultsInstalled) return;
  defaultsInstalled = true;

  for (const component of [Text, TextInput]) {
    const target = component as unknown as { defaultProps?: { style?: StyleProp<TextStyle> } };
    target.defaultProps = {
      ...target.defaultProps,
      style: [target.defaultProps?.style, { fontFamily: fontFamilies.regular }],
    };
  }
}
