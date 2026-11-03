/// The name to greet someone by. A family name like "D. Vijayan , V. Prema"
/// or "Kalpana N / Vijay S" lists both parents: greet the first, and do not
/// stop at a leading initial ("D." alone) — "D. Vijayan", "Kalpana".
String greetingName(String? fullName) {
  final all = (fullName ?? '').trim();
  final first = all.split(RegExp(r'\s*[,/&]\s*')).firstWhere((p) => p.trim().isNotEmpty, orElse: () => all).trim();
  final words = first.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
  final out = <String>[];
  for (final w in words) {
    out.add(w);
    // An initial: "D.", "D", "S.K." — keep going to the actual name.
    final isInitial = w.replaceAll('.', '').length <= 2 && (w.contains('.') || w.length <= 2);
    if (!isInitial) break;
  }
  return out.join(' ');
}
