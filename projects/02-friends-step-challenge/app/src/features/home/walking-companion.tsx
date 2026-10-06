import Svg, { Ellipse, G, Path } from 'react-native-svg';

/** Original vector extracted from the approved B reference, not Duolingo artwork. */
export function WalkingCompanion({ happy = false, helpful = false, size = 72, shadow = true }: { happy?: boolean; helpful?: boolean; size?: number; shadow?: boolean }) {
  return <Svg accessible={false} width={size} height={size * 150 / 160} viewBox="0 0 160 150">
    {shadow ? <Ellipse cx="82" cy="137" rx="53" ry="8" fill="#CCE5EE" /> : null}
    <G strokeLinecap="round" strokeLinejoin="round">
      <Path d="M60 107 50 127m45-18 12 17" fill="none" stroke="#087CA5" strokeWidth="10" />
      <Path d="M47 121c-7 0-15 8-12 12 2 4 24 3 26-2 1-5-8-10-14-10Zm61-1c-6 0-13 9-10 13 2 4 26 5 29 0 3-4-12-13-19-13Z" fill="#FFD34E" stroke="#D9A929" strokeWidth="3" />
      <Path d={happy ? 'M43 75 23 49m86 24 23-27' : helpful ? 'M42 77 25 92m84-14 22-27' : 'M42 77 25 92m84-14 22-12'} fill="none" stroke="#087CA5" strokeWidth="9" />
      <Path d="M36 78c-1-34 21-54 43-54 30 0 48 26 43 55-3 20-12 37-39 39-30 2-45-15-47-40Z" fill="#13B5E8" stroke="#087CA5" strokeWidth="4" />
      <Path d="M48 57c3-13 14-22 26-22 7 0 7 7 1 9-8 2-13 7-18 16-4 6-11 3-9-3Z" fill="#76D9F5" />
      {happy ? <Path d="m57 72 5-4 5 4m22 0 5-4 5 4" stroke="#173342" strokeWidth="4" fill="none" /> : <><Ellipse cx="63" cy="71" rx="4" ry="7" fill="#173342" /><Ellipse cx="94" cy="71" rx="4" ry="7" fill="#173342" /></>}
      <Path d="M69 84q10 13 21-1" stroke="#173342" strokeWidth="4" fill="none" />
      <Ellipse cx="53" cy="82" rx="7" ry="4" fill="#F77768" /><Ellipse cx="106" cy="81" rx="7" ry="4" fill="#F77768" />
    </G>
  </Svg>;
}
