import { usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export enum AppTabs {
  Events = 'events',
  Circles = 'circles',
}

export default function TabsLayout() {
  const isCircles = usePathname().includes(AppTabs.Circles);

  return (
    <NativeTabs tintColor='#6366f1'>
      <NativeTabs.Trigger name={AppTabs.Events}>
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'square.stack',
            selected: 'square.stack.fill',
          }}
        />
        <NativeTabs.Trigger.Label>Events</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name={AppTabs.Circles}>
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'person.2',
            selected: 'person.2.fill',
          }}
        />
        <NativeTabs.Trigger.Label>Circles</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='map' role='search'>
        <NativeTabs.Trigger.Icon sf={isCircles ? 'plus' : 'magnifyingglass'} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
