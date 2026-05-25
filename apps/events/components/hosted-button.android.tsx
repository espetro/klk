import { Button, type ButtonProps } from '@expo/ui';
import { Host } from '@expo/ui/jetpack-compose';

export function HostedButton(props: ButtonProps) {
  return (
    <Host matchContents>
      <Button {...props} />
    </Host>
  );
}
