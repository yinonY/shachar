package expo.modules.alarmscheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONObject

internal data class AlarmSchedule(
  val id: String,
  val wakeAtMillis: Long,
  val sunriseMinutes: Double,
  val ringDelayMinutes: Double,
  val label: String,
)

internal object AlarmScheduler {
  private const val PREFERENCES = "dawn_scheduled_alarms"
  private const val MINUTE_MS = 60_000L

  fun schedule(context: Context, alarm: AlarmSchedule) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val triggerAt = alarm.wakeAtMillis - (alarm.sunriseMinutes * MINUTE_MS).toLong()
    val operation = requireNotNull(receiverPendingIntent(context, alarm.id, PendingIntent.FLAG_UPDATE_CURRENT))
    val showIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    val showOperation = PendingIntent.getActivity(
      context,
      alarm.id.hashCode().xor(0x51A7),
      showIntent ?: Intent(context, AlarmReceiver::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag(),
    )

    save(context, alarm)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAt, showOperation), operation)
    } else {
      alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, operation)
    }
  }

  fun cancel(context: Context, alarmId: String) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val operation = receiverPendingIntent(context, alarmId, PendingIntent.FLAG_NO_CREATE) ?: return
    alarmManager.cancel(operation)
    operation.cancel()
    preferences(context).edit().remove(alarmId).apply()
  }

  fun snooze(context: Context, alarmId: String, snoozeMinutes: Double) {
    val previous = read(context, alarmId) ?: return
    context.startService(
      Intent(context, AlarmService::class.java)
        .setAction(AlarmService.ACTION_DISMISS)
        .putExtra(AlarmService.EXTRA_ALARM_ID, alarmId),
    )
    schedule(
      context,
      previous.copy(
        wakeAtMillis = System.currentTimeMillis() + (snoozeMinutes.coerceIn(1.0, 60.0) * MINUTE_MS).toLong(),
        sunriseMinutes = 0.0,
        ringDelayMinutes = 0.0,
      ),
    )
  }

  fun read(context: Context, alarmId: String): AlarmSchedule? {
    val raw = preferences(context).getString(alarmId, null) ?: return null
    return runCatching {
      val json = JSONObject(raw)
      AlarmSchedule(
        id = alarmId,
        wakeAtMillis = json.getLong("wakeAtMillis"),
        sunriseMinutes = json.getDouble("sunriseMinutes"),
        ringDelayMinutes = json.getDouble("ringDelayMinutes"),
        label = json.getString("label"),
      )
    }.getOrNull()
  }

  fun restoreAll(context: Context) {
    preferences(context).all.keys.forEach { alarmId ->
      read(context, alarmId)?.let { alarm ->
        if (alarm.wakeAtMillis > System.currentTimeMillis()) {
          schedule(context, alarm)
        } else {
          cancel(context, alarmId)
        }
      }
    }
  }

  private fun save(context: Context, alarm: AlarmSchedule) {
    val json = JSONObject()
      .put("wakeAtMillis", alarm.wakeAtMillis)
      .put("sunriseMinutes", alarm.sunriseMinutes)
      .put("ringDelayMinutes", alarm.ringDelayMinutes)
      .put("label", alarm.label)
    preferences(context).edit().putString(alarm.id, json.toString()).apply()
  }

  private fun preferences(context: Context) =
    context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

  private fun receiverPendingIntent(context: Context, alarmId: String, extraFlags: Int): PendingIntent? {
    val intent = Intent(context, AlarmReceiver::class.java).putExtra(AlarmService.EXTRA_ALARM_ID, alarmId)
    return PendingIntent.getBroadcast(
      context,
      alarmId.hashCode(),
      intent,
      extraFlags or immutableFlag(),
    )
  }

  private fun immutableFlag() =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
}