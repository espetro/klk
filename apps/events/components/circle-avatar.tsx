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
      <Text style={{ fontSize, fontWeight: '600', color: '#fdfbf7' }}>{initial}</Text>
    </View>
  );
}
