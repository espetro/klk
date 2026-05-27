import AddIcon from '@expo/material-symbols/add.xml';
import { FloatingActionButton, Host, Icon } from '@expo/ui/jetpack-compose';

interface HostedFabProps {
  onPress: () => void;
}

export function HostedFab({ onPress }: HostedFabProps) {
  return (
    <Host
      matchContents
      style={{ position: 'absolute', bottom: 24, right: 24 }}
    >
      <FloatingActionButton onClick={onPress}>
        <FloatingActionButton.Icon>
          <Icon source={AddIcon} />
        </FloatingActionButton.Icon>
      </FloatingActionButton>
    </Host>
  );
}
