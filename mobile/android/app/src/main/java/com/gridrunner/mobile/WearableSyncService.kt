package com.gridrunner.mobile

import android.content.Context
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject

class WearableSyncService(private val context: Context) : MessageClient.OnMessageReceivedListener {
    private val messageClient: MessageClient = Wearable.getMessageClient(context)

    init {
        messageClient.addListener(this)
    }

    fun sendStats(stats: WatchStats) {
        val data = JSONObject().apply {
            put("speed", stats.speed)
            put("hp", stats.hp)
            put("fuel", stats.fuel)
            put("level", stats.level)
            put("vehicle", stats.vehicle)
        }.toString()
        messageClient.sendMessage("/gridrunner/stats", data.toByteArray())
    }

    override fun onMessageReceived(messageEvent: MessageEvent) {
        when (messageEvent.path) {
            "/gridrunner/checkIn" -> {
                // Обработка чек-ина с часов
            }
            "/gridrunner/selectVehicle" -> {
                val data = String(messageEvent.data)
                val json = JSONObject(data)
                val vehicle = json.getString("vehicle")
                // Обновление транспорта
            }
        }
    }
}

data class WatchStats(
    val speed: Double,
    val hp: Int,
    val fuel: Int,
    val level: Int,
    val vehicle: String
)