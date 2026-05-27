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

function getColorForId(id: string): string {
  const hash = parseInt(id.slice(0, 6), 16);
  return PALETTE[hash % PALETTE.length]!;
}

interface Props {
  circleId: string;
  name: string;
  size?: number;
}

export function CircleAvatar({ circleId, name, size = 44 }: Props) {
  const backgroundColor = getColorForId(circleId);
  const initial = name[0]?.toUpperCase() || '?';
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
      <Text style={{ fontSize, fontWeight: '600', color: '#fff' }}>{initial}</Text>
    </View>
  );
}
