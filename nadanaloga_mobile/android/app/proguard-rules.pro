# R8 keep rules. Anything that resolves a class by name at runtime must be
# listed here, or it compiles fine and fails only on the device.

# --- Flutter embedding and plugins ---
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# --- Razorpay -----------------------------------------------------------
# Online payments are switched off for now, but the SDK ships with the app and
# will be re-enabled. It reflects over its own classes and drives a WebView
# checkout, so both the classes and the JavascriptInterface methods must stay.
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclasseswithmembers class * {
    public void onPayment*(...);
}
-optimizations !method/inlining/*

# --- Firebase / FCM push notifications ---
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# --- Play Core: referenced by Flutter's deferred components, not bundled ---
-dontwarn com.google.android.play.core.**

# --- Keep annotations and signatures that reflection depends on ---
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
