import { View, Text } from 'react-native';

const PALETTE = [
  '#c45b3a',
  '#d97b5d',
  '#7a8450',
  '#5c554d',
  '#4F46E5',
  '#7C3AED',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#0EA5E9',
  '#10B981',
  '#FBBF24',
];

function getColorForPubkey(pubkey: string): string {
  const hash = parseInt(pubkey.slice(0, 6), 16);
  return PALETTE[hash % PALETTE.length]!;
}

interface Props {
  pubkey: string;
  size?: number;
}

export function MemberAvatar({ pubkey, size = 40 }: Props) {
  const backgroundColor = getColorForPubkey(pubkey);
  const initials = pubkey.slice(0, 2).toUpperCase();
  const fontSize = Math.round(size * 0.4);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize, fontWeight: '600', color: '#fdfbf7' }}>{initials}</Text>
    </View>
  );
}
