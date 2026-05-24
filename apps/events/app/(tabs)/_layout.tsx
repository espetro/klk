import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name='events'>
        <NativeTabs.Trigger.Icon sf='calendar' md='event' />
        <NativeTabs.Trigger.Label>Events</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='circles'>
        <NativeTabs.Trigger.Icon sf='person.2' md='group' />
        <NativeTabs.Trigger.Label>Circles</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
