package expo.modules.alarmscheduler

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.app.NotificationManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AlarmSchedulerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AlarmScheduler")

    AsyncFunction("scheduleAlarm") { alarmId: String, wakeAtMillis: Double, sunriseMinutes: Double, ringDelayMinutes: Double, label: String ->
      AlarmScheduler.schedule(
        requireContext(),
        AlarmSchedule(alarmId, wakeAtMillis.toLong(), sunriseMinutes, ringDelayMinutes, label),
      )
    }

    AsyncFunction("cancelAlarm") { alarmId: String ->
      AlarmScheduler.cancel(requireContext(), alarmId)
    }

    AsyncFunction("dismissAlarm") { alarmId: String ->
      requireContext().startService(
        Intent(requireContext(), AlarmService::class.java)
          .setAction(AlarmService.ACTION_DISMISS)
          .putExtra(AlarmService.EXTRA_ALARM_ID, alarmId),
      )
      AlarmScheduler.cancel(requireContext(), alarmId)
    }

    AsyncFunction("snoozeAlarm") { alarmId: String, snoozeMinutes: Double ->
      AlarmScheduler.snooze(requireContext(), alarmId, snoozeMinutes)
    }

    AsyncFunction("canScheduleExactAlarms") {
      val manager = requireContext().getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
      Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms()
    }

    AsyncFunction("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        requireContext().startActivity(
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
            .setData(Uri.parse("package:${requireContext().packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
      }
    }

    AsyncFunction("canUseFullScreenIntent") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        requireContext().getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
      } else {
        true
      }
    }

    AsyncFunction("openFullScreenIntentSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        requireContext().startActivity(
          Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
            .setData(Uri.parse("package:${requireContext().packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
      }
    }

    AsyncFunction("areNotificationsEnabled") {
      requireContext().getSystemService(NotificationManager::class.java).areNotificationsEnabled()
    }

    AsyncFunction("isIgnoringBatteryOptimizations") {
      val powerManager = requireContext().getSystemService(Context.POWER_SERVICE) as PowerManager
      Build.VERSION.SDK_INT < Build.VERSION_CODES.M || powerManager.isIgnoringBatteryOptimizations(requireContext().packageName)
    }

    AsyncFunction("openBatteryOptimizationSettings") {
      requireContext().startActivity(
        Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }
  }

  private fun requireContext() = requireNotNull(appContext.reactContext)
}