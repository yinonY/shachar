const { withAndroidManifest } = require('expo/config-plugins');

const permissions = [
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_FULL_SCREEN_INTENT',
  'android.permission.WAKE_LOCK',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.RECEIVE_BOOT_COMPLETED',
];

function addPermission(manifest, name) {
  const usesPermissions = manifest['uses-permission'] ?? [];
  if (!usesPermissions.some((permission) => permission.$['android:name'] === name)) {
    usesPermissions.push({ $: { 'android:name': name } });
  }
  manifest['uses-permission'] = usesPermissions;
}

function addComponent(components, name, attributes) {
  const existing = components.find((component) => component.$['android:name'] === name);
  if (existing) {
    existing.$ = { ...existing.$, ...attributes };
  } else {
    components.push({ $: { 'android:name': name, ...attributes } });
  }
}

const withAlarmScheduler = (config) => withAndroidManifest(config, (modConfig) => {
  const manifest = modConfig.modResults.manifest;
  permissions.forEach((permission) => addPermission(manifest, permission));

  const application = manifest.application?.[0];
  if (!application) return modConfig;

  application.receiver ??= [];
  application.service ??= [];
  application.activity ??= [];
  addComponent(application.receiver, 'expo.modules.alarmscheduler.AlarmReceiver', { 'android:exported': 'false' });
  addComponent(application.receiver, 'expo.modules.alarmscheduler.AlarmBootReceiver', { 'android:exported': 'true' });
  const bootReceiver = application.receiver.find((receiver) => receiver.$['android:name'] === 'expo.modules.alarmscheduler.AlarmBootReceiver');
  bootReceiver['intent-filter'] ??= [];
  const bootActions = ['android.intent.action.BOOT_COMPLETED', 'android.intent.action.MY_PACKAGE_REPLACED', 'android.intent.action.TIME_SET', 'android.intent.action.TIMEZONE_CHANGED'];
  const existingActions = new Set(bootReceiver['intent-filter'].flatMap((filter) => (filter.action ?? []).map((action) => action.$['android:name'])));
  const missingActions = bootActions.filter((action) => !existingActions.has(action));
  if (missingActions.length > 0) {
    bootReceiver['intent-filter'].push({ action: missingActions.map((name) => ({ $: { 'android:name': name } })) });
  }
  addComponent(application.service, 'expo.modules.alarmscheduler.AlarmService', {
    'android:exported': 'false',
    'android:foregroundServiceType': 'specialUse',
  });
  const alarmService = application.service.find((service) => service.$['android:name'] === 'expo.modules.alarmscheduler.AlarmService');
  alarmService.property ??= [];
  if (!alarmService.property.some((property) => property.$['android:name'] === 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE')) {
    alarmService.property.push({
      $: {
        'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
        'android:value': 'Keeps the user-requested wake sequence active until dismissed',
      },
    });
  }

  const mainActivity = application.activity.find((activity) => activity.$['android:name']?.endsWith('.MainActivity'));
  if (mainActivity) {
    mainActivity.$['android:showWhenLocked'] = 'true';
    mainActivity.$['android:turnScreenOn'] = 'true';
  }

  return modConfig;
});

module.exports = withAlarmScheduler;