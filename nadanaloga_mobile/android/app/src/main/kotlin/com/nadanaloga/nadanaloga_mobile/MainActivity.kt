package com.nadanaloga.nadanaloga_mobile

import android.os.Bundle
import androidx.core.view.WindowCompat
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Edge-to-edge on every Android version, as Android 15 does by default
        // (Play Console: "Edge-to-edge may not display for all users").
        // Flutter pads its screens with the system-bar insets.
        WindowCompat.enableEdgeToEdge(window)
        super.onCreate(savedInstanceState)
    }
}
