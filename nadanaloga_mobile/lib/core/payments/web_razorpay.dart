/// Razorpay checkout for the WEB build of this app (the iPhone web app at
/// /app). The razorpay_flutter plugin only supports Android and iOS, so on web
/// `Razorpay().open()` did nothing and "Pay" looked unresponsive. On web this
/// opens Razorpay's own Standard Checkout (checkout.js) instead.
///
/// On Android / iOS the stub is used and the plugin keeps working as before.
library;

export 'web_razorpay_stub.dart' if (dart.library.js_interop) 'web_razorpay_web.dart';
