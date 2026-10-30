import { usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { getWakePreferences } from '@/storage/wake-data';

export default function AppTabs() {
  const pathname = usePathname();
  const [hebrew, setHebrew] = useState(false);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    void getWakePreferences().then((preferences) => setHebrew(preferences.language === 'he'));
  }, [pathname]);

  return (
    <NativeTabs
      hidden={pathname === '/test'}
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="alarms">
        <NativeTabs.Trigger.Label>{hebrew ? 'התעוררויות' : 'Alarms'}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="test">
        <NativeTabs.Trigger.Label>{hebrew ? 'בדיקה' : 'Wake test'}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="reliability">
        <NativeTabs.Trigger.Label>{hebrew ? 'בדיקת מכשיר' : 'Device check'}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{hebrew ? 'הגדרות' : 'Settings'}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{hebrew ? 'בית' : 'Home'}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>{hebrew ? 'גילוי' : 'Explore'}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}
