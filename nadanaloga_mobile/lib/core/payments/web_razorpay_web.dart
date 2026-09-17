import 'dart:async';
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

const _checkoutUrl = 'https://checkout.razorpay.com/v1/checkout.js';
Future<void>? _loading;

Future<void> _ensureCheckoutScript() {
  if (globalContext.has('Razorpay')) return Future.value();
  return _loading ??= _injectScript();
}

Future<void> _injectScript() {
  final done = Completer<void>();
  final document = globalContext.getProperty<JSObject>('document'.toJS);
  final script = document.callMethod<JSObject>('createElement'.toJS, 'script'.toJS);
  script.setProperty('src'.toJS, _checkoutUrl.toJS);
  script.setProperty(
    'onload'.toJS,
    ((JSAny? _) {
      if (!done.isCompleted) done.complete();
    }).toJS,
  );
  script.setProperty(
    'onerror'.toJS,
    ((JSAny? _) {
      _loading = null; // allow a retry
      if (!done.isCompleted) done.completeError(StateError('checkout.js failed to load'));
    }).toJS,
  );
  document.getProperty<JSObject>('head'.toJS).callMethod<JSAny?>('appendChild'.toJS, script);
  return done.future;
}

/// Open Razorpay Standard Checkout with the same options the native plugin
/// takes (key, order_id, amount, prefill, plus the server's `checkout` block).
/// Exactly one of [onSuccess] / [onFailure] is called.
Future<void> openWebRazorpay(
  Map<String, dynamic> options, {
  required void Function(String paymentId, String orderId, String signature) onSuccess,
  required void Function(String message) onFailure,
}) async {
  try {
    await _ensureCheckoutScript();
  } catch (_) {
    onFailure('Could not open the payment window. Check your internet connection and try again.');
    return;
  }

  var settled = false;
  final opts = JSObject();
  // `v` must be typed: jsify() is an extension method, and extension methods
  // don't exist on `dynamic` (release builds throw NoSuchMethodError).
  options.forEach((k, Object? v) => opts.setProperty(k.toJS, v.jsify()));

  String read(JSObject o, String key) => o.getProperty<JSString?>(key.toJS)?.toDart ?? '';

  opts.setProperty(
    'handler'.toJS,
    ((JSObject response) {
      if (settled) return;
      settled = true;
      onSuccess(
        read(response, 'razorpay_payment_id'),
        read(response, 'razorpay_order_id'),
        read(response, 'razorpay_signature'),
      );
    }).toJS,
  );
  final modal = JSObject();
  modal.setProperty(
    'ondismiss'.toJS,
    (() {
      if (settled) return;
      settled = true;
      onFailure('Payment cancelled.');
    }).toJS,
  );
  opts.setProperty('modal'.toJS, modal);

  final ctor = globalContext.getProperty<JSFunction>('Razorpay'.toJS);
  final rz = ctor.callAsConstructor<JSObject>(opts);
  rz.callMethod<JSAny?>(
    'on'.toJS,
    'payment.failed'.toJS,
    ((JSObject failure) {
      if (settled) return;
      settled = true;
      final error = failure.getProperty<JSObject?>('error'.toJS);
      final description = error?.getProperty<JSString?>('description'.toJS)?.toDart;
      onFailure(description ?? 'Payment failed.');
    }).toJS,
  );
  rz.callMethod<JSAny?>('open'.toJS);
}
