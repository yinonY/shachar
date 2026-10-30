package expo.modules.alarmscheduler

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class AlarmService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_DISMISS) {
      stopSelf()
      return START_NOT_STICKY
    }

    val alarmId = intent?.getStringExtra(EXTRA_ALARM_ID) ?: return START_NOT_STICKY
    createNotificationChannel()
    val notification = createNotification(intent, alarmId)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    acquireWakeLock()
    return START_STICKY
  }

  override fun onDestroy() {
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun createNotification(intent: Intent, alarmId: String): Notification {
    val wakeAt = intent.getLongExtra(EXTRA_WAKE_AT, System.currentTimeMillis())
    val sunrise = intent.getDoubleExtra(EXTRA_SUNRISE_MINUTES, 30.0)
    val ringDelay = intent.getDoubleExtra(EXTRA_RING_DELAY_MINUTES, 5.0)
    val label = intent.getStringExtra(EXTRA_LABEL).orEmpty()
    val deepLink = Uri.parse("shachar:///test").buildUpon()
      .appendQueryParameter("mode", "alarm")
      .appendQueryParameter("alarmId", alarmId)
      .appendQueryParameter("wakeAt", wakeAt.toString())
      .appendQueryParameter("sunriseMinutes", sunrise.toString())
      .appendQueryParameter("ringDelayMinutes", ringDelay.toString())
      .appendQueryParameter("label", label)
      .build()
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
      ?.setAction(Intent.ACTION_VIEW)
      ?.setData(deepLink)
      ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val fullScreenIntent = launchIntent?.let {
      PendingIntent.getActivity(
        this,
        alarmId.hashCode().xor(0xA1A2),
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag(),
      )
    }

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(if (label.isBlank()) "Your morning is beginning" else label)
      .setContentText("A gentle wake sequence is underway")
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setFullScreenIntent(fullScreenIntent, true)
      .build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(CHANNEL_ID, "Wake alarms", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Active gentle wake sequences"
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }

  private fun acquireWakeLock() {
    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "DawnAlarm:WakeSequence").apply {
      acquire(45 * 60 * 1000L)
    }
  }

  private fun immutableFlag() =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

  companion object {
    const val ACTION_START = "expo.modules.alarmscheduler.START"
    const val ACTION_DISMISS = "expo.modules.alarmscheduler.DISMISS"
    const val EXTRA_ALARM_ID = "alarmId"
    const val EXTRA_WAKE_AT = "wakeAtMillis"
    const val EXTRA_SUNRISE_MINUTES = "sunriseMinutes"
    const val EXTRA_RING_DELAY_MINUTES = "ringDelayMinutes"
    const val EXTRA_LABEL = "label"
    private const val CHANNEL_ID = "dawn-wake-sequence"
    private const val NOTIFICATION_ID = 7194
  }
}