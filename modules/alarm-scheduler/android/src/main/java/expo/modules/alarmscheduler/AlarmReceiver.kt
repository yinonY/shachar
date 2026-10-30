package expo.modules.alarmscheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val alarmId = intent.getStringExtra(AlarmService.EXTRA_ALARM_ID) ?: return
    val alarm = AlarmScheduler.read(context, alarmId) ?: return
    val serviceIntent = Intent(context, AlarmService::class.java)
      .setAction(AlarmService.ACTION_START)
      .putExtra(AlarmService.EXTRA_ALARM_ID, alarm.id)
      .putExtra(AlarmService.EXTRA_WAKE_AT, alarm.wakeAtMillis)
      .putExtra(AlarmService.EXTRA_SUNRISE_MINUTES, alarm.sunriseMinutes)
      .putExtra(AlarmService.EXTRA_RING_DELAY_MINUTES, alarm.ringDelayMinutes)
      .putExtra(AlarmService.EXTRA_LABEL, alarm.label)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent)
    } else {
      context.startService(serviceIntent)
    }
  }
}