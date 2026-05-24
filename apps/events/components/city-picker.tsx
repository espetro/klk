import { CITIES } from '@klk/infrastructure';
import { Picker } from '@react-native-picker/picker';
import { View } from 'react-native';

interface Props {
  current: string;
  onChange: (slug: string) => void;
}

export function CityPicker({ current, onChange }: Props) {
  return (
    <View className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
      <Picker
        selectedValue={current}
        onValueChange={(value) => onChange(value as string)}
        className='h-12'
      >
        {CITIES.map((c) => (
          <Picker.Item key={c.slug} label={c.label} value={c.slug} />
        ))}
      </Picker>
    </View>
  );
}
