import { View, Text } from 'react-native';

const PALETTE = [
  '#4F46E5', // indigo
  '#7C3AED', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#0EA5E9', // blue
  '#10B981', // emerald
  '#FBBF24', // amber
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
      <Text style={{ fontSize, fontWeight: '600', color: '#fff' }}>{initials}</Text>
    </View>
  );
}
