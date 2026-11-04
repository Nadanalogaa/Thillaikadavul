import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/utils/fee_format.dart';
import 'insights_data.dart';
import 'more_insight_screens.dart';

// Building blocks of the admin dashboard.

const _radius = 16.0;

BoxDecoration _panel({Color? border}) => BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(_radius),
      border: Border.all(color: border ?? AppColors.divider),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.03),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ],
    );

/// White rounded card that is tappable as a whole.
class DashPanel extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final Color? border;
  const DashPanel({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(14),
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: _panel(border: border),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(_radius),
          onTap: onTap,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

/// Section title with an optional action on the right.
class DashSectionTitle extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;
  const DashSectionTitle(this.title, {super.key, this.action, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(
            child: Text(title,
                style: AppTextStyles.h4,
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ),
          if (action != null)
            InkWell(
              onTap: onAction,
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                child: Text(action!,
                    style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600)),
              ),
            ),
        ],
      ),
    );
  }
}

// ----------------------------------------------------------------- KPIs ----

class KpiItem {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const KpiItem(this.label, this.value, this.icon, this.color, this.onTap);
}

/// One row of compact count tiles; scrolls sideways if they don't fit.
class KpiRow extends StatelessWidget {
  final List<KpiItem> items;
  const KpiRow({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, c) {
      const gap = 8.0;
      // Four fit across; with more, tiles widen a little and the next one
      // peeks in to show the row scrolls.
      final across = items.length > 4 ? 3.6 : 4.0;
      final w = ((c.maxWidth - gap * 3) / across).clamp(68.0, 120.0);
      return SizedBox(
        height: 86,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(width: gap),
          itemBuilder: (context, i) {
            final k = items[i];
            return SizedBox(
              width: w,
              child: DashPanel(
                onTap: k.onTap,
                padding: const EdgeInsets.fromLTRB(10, 10, 6, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(k.icon, size: 18, color: k.color),
                    const Spacer(),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(k.value,
                          style: AppTextStyles.h3.copyWith(
                              fontWeight: FontWeight.w700, height: 1.1)),
                    ),
                    Text(k.label,
                        style: AppTextStyles.caption,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            );
          },
        ),
      );
    });
  }
}

// ---------------------------------------------------------------- today ----

(String, Color) todayState(String? s) {
  switch (s) {
    case 'running':
      return ('In class', AppColors.success);
    case 'upcoming':
      return ('Upcoming', AppColors.info);
    case 'not_marked':
      return ('Not marked', AppColors.error);
    case 'marked':
      return ('Marked', AppColors.textSecondary);
    case 'cancelled':
      return ('Cancelled', AppColors.textHint);
    default:
      return (s ?? '', AppColors.textSecondary);
  }
}

/// Today's classes as a sideways strip of small cards.
class TodayStrip extends StatefulWidget {
  final TodayInsights today;
  final void Function(InsightClass) onTap;
  const TodayStrip({super.key, required this.today, required this.onTap});

  @override
  State<TodayStrip> createState() => _TodayStripState();
}

class _TodayStripState extends State<TodayStrip> {
  static const cardW = 176.0;
  static const gap = 8.0;
  late final ScrollController _scroll;

  @override
  void initState() {
    super.initState();
    // Start the strip at the first class that hasn't finished.
    final firstOpen = widget.today.classes
        .indexWhere((c) => c.state == 'running' || c.state == 'upcoming');
    _scroll = ScrollController(
        initialScrollOffset: firstOpen > 0 ? firstOpen * (cardW + gap) : 0);
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final classes = widget.today.classes;
    final onTap = widget.onTap;
    if (classes.isEmpty) {
      return DashPanel(
        child: Row(
          children: [
            const Icon(Icons.event_available, color: AppColors.textSecondary),
            const SizedBox(width: 10),
            Expanded(
              child: Text('No classes today.',
                  style: AppTextStyles.bodyMedium
                      .copyWith(color: AppColors.textSecondary)),
            ),
          ],
        ),
      );
    }
    return SizedBox(
      height: 96,
      child: ListView.separated(
        controller: _scroll,
        scrollDirection: Axis.horizontal,
        itemCount: classes.length,
        separatorBuilder: (_, __) => const SizedBox(width: gap),
        itemBuilder: (context, i) {
          final c = classes[i];
          final (label, color) = todayState(c.state);
          final dim = c.state == 'marked' || c.state == 'cancelled';
          return SizedBox(
            width: cardW,
            child: DashPanel(
              onTap: () => onTap(c),
              border: c.state == 'running' || c.state == 'not_marked'
                  ? color.withValues(alpha: 0.5)
                  : null,
              padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
              child: Opacity(
                opacity: dim ? 0.6 : 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(insightTime(c.startTime),
                              style: AppTextStyles.labelLarge,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                        ),
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                              color: color, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 4),
                        Text(label,
                            style: AppTextStyles.caption.copyWith(
                                color: color, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const Spacer(),
                    Text(c.batchName,
                        style: AppTextStyles.bodySmall
                            .copyWith(fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    Text(
                      [
                        c.teacherName,
                        '${c.students} ${c.students == 1 ? 'student' : 'students'}',
                      ].whereType<String>().join(' · '),
                      style: AppTextStyles.caption,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ----------------------------------------------------------------- fees ----

/// This month's billing, what's outstanding, and a 6-month billed vs
/// collected chart. Tapping opens the pending-fees list.
class FeesPanel extends StatelessWidget {
  final FeeInsights fees;
  final List<TrendPoint> trend;
  final VoidCallback onTap;
  const FeesPanel(
      {super.key, required this.fees, required this.trend, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final f = fees;
    final frac =
        f.billed <= 0 ? 0.0 : (f.collected / f.billed).clamp(0.0, 1.0).toDouble();
    final chips = <Widget>[
      if (f.overdue > 0)
        InsightChip(
            'Overdue ${FeeFormat.rupees(f.overdue)} · ${f.overdueStudents}',
            color: AppColors.error,
            icon: Icons.warning_amber_rounded),
      if (f.verifyingBills > 0)
        InsightChip('Screenshots to check: ${f.verifyingBills}',
            color: AppColors.info, icon: Icons.image_outlined),
      if (f.olderDue > 0)
        InsightChip('Older bills ${FeeFormat.rupees(f.olderDue)}',
            color: AppColors.warning, icon: Icons.history),
    ];
    return DashPanel(
      onTap: onTap,
      border: f.overdue > 0 ? AppColors.error.withValues(alpha: 0.35) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(f.period,
                    style: AppTextStyles.caption,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
              ),
              const Icon(Icons.chevron_right,
                  size: 20, color: AppColors.textHint),
            ],
          ),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              f.due > 0 ? '${FeeFormat.rupees(f.due)} due' : 'All paid',
              style: AppTextStyles.h2.copyWith(
                  fontWeight: FontWeight.w700,
                  color: f.due > 0 ? AppColors.textPrimary : AppColors.success),
            ),
          ),
          Text(
            f.due > 0
                ? '${f.dueStudents} ${f.dueStudents == 1 ? 'student' : 'students'} yet to pay'
                : 'Every bill for ${f.period} is settled',
            style: AppTextStyles.bodySmall
                .copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: frac,
              minHeight: 8,
              backgroundColor: AppColors.divider,
              color: AppColors.success,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Text('Collected ${FeeFormat.rupees(f.collected)}',
                    style: AppTextStyles.caption,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
              ),
              Text('of ${FeeFormat.rupees(f.billed)}',
                  style: AppTextStyles.caption),
            ],
          ),
          if (chips.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(spacing: 6, runSpacing: 6, children: chips),
          ],
          if (trend.any((t) => t.billed > 0 || t.collected > 0)) ...[
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 12),
            TrendChart(points: trend),
          ],
        ],
      ),
    );
  }
}

/// Paired bars per month (billed light, collected solid), plain widgets.
class TrendChart extends StatelessWidget {
  final List<TrendPoint> points;
  const TrendChart({super.key, required this.points});

  static String _short(num v) {
    if (v >= 100000) {
      final l = v / 100000;
      return '₹${l.toStringAsFixed(l >= 10 ? 0 : 1)}L';
    }
    if (v >= 1000) return '₹${(v / 1000).round()}k';
    return FeeFormat.rupees(v);
  }

  @override
  Widget build(BuildContext context) {
    final max = points.fold<num>(
        0, (m, p) => [m, p.billed, p.collected].reduce((a, b) => a > b ? a : b));
    const barH = 64.0;
    double h(num v) => max <= 0 ? 0 : (v / max * barH).clamp(v > 0 ? 2.0 : 0.0, barH);
    final last = points.isEmpty ? null : points.last;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text('Last ${points.length} months',
                  style: AppTextStyles.caption
                      .copyWith(fontWeight: FontWeight.w600)),
            ),
            _legend(AppColors.primary.withValues(alpha: 0.18), 'Billed'),
            const SizedBox(width: 10),
            _legend(AppColors.primary, 'Collected'),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: barH,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (final p in points)
                Expanded(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _bar(h(p.billed),
                          AppColors.primary.withValues(alpha: 0.18)),
                      const SizedBox(width: 3),
                      _bar(h(p.collected), AppColors.primary),
                    ],
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            for (final p in points)
              Expanded(
                child: Text(
                  p.shortLabel,
                  textAlign: TextAlign.center,
                  style: AppTextStyles.caption.copyWith(
                      fontWeight:
                          identical(p, last) ? FontWeight.w700 : FontWeight.w400),
                ),
              ),
          ],
        ),
        if (points.length >= 2) ...[
          const SizedBox(height: 4),
          Text(
            'Last month ${_short(points[points.length - 2].collected)} collected of ${_short(points[points.length - 2].billed)}',
            style: AppTextStyles.caption,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ],
    );
  }

  Widget _bar(double height, Color color) => Container(
        width: 9,
        height: height,
        decoration: BoxDecoration(
          color: color,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
        ),
      );

  Widget _legend(Color c, String label) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                  color: c, borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 4),
          Text(label, style: AppTextStyles.caption),
        ],
      );
}

// ------------------------------------------------------ attention tiles ----

class AttentionItem {
  final IconData icon;
  final String title;
  final int value;
  final String context;

  /// Colour when something needs doing; null = calm (grey).
  final Color? alert;
  final VoidCallback onTap;
  const AttentionItem({
    required this.icon,
    required this.title,
    required this.value,
    required this.context,
    required this.onTap,
    this.alert,
  });
}

/// Two-column grid of attention tiles; rows share a height.
class AttentionGrid extends StatelessWidget {
  final List<AttentionItem> items;
  const AttentionGrid({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < items.length; i += 2) {
      rows.add(IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(child: _AttentionTile(items[i])),
            const SizedBox(width: 10),
            Expanded(
              child: i + 1 < items.length
                  ? _AttentionTile(items[i + 1])
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      ));
      if (i + 2 < items.length) rows.add(const SizedBox(height: 10));
    }
    return Column(children: rows);
  }
}

class _AttentionTile extends StatelessWidget {
  final AttentionItem item;
  const _AttentionTile(this.item);

  @override
  Widget build(BuildContext context) {
    final color = item.alert ?? AppColors.textSecondary;
    final calm = item.alert == null;
    return DashPanel(
      onTap: item.onTap,
      border: calm ? null : color.withValues(alpha: 0.35),
      padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: calm ? 0.08 : 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(item.icon, size: 18, color: color),
              ),
              const Spacer(),
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerRight,
                  child: Text(
                    '${item.value}',
                    style: AppTextStyles.h2.copyWith(
                      fontWeight: FontWeight.w700,
                      color: calm ? AppColors.textPrimary : color,
                      height: 1.1,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(item.title,
              style: AppTextStyles.labelLarge,
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Text(item.context,
              style: AppTextStyles.caption,
              maxLines: 2,
              overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------- extra bills ----

class ExtraBillsPanel extends StatelessWidget {
  final List<ExtraBillInsight> bills;
  final void Function(ExtraBillInsight) onTap;
  const ExtraBillsPanel({super.key, required this.bills, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final shown = bills.take(3).toList();
    return DashPanel(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        children: [
          for (var i = 0; i < shown.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 14, endIndent: 14),
            InkWell(
              onTap: () => onTap(shown[i]),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                child: ExtraBillProgress(bill: shown[i]),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// -------------------------------------------------------- quick actions ----

class QuickAction {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const QuickAction(this.icon, this.label, this.color, this.onTap);
}

class QuickActionsRow extends StatelessWidget {
  final List<QuickAction> actions;
  const QuickActionsRow({super.key, required this.actions});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final a in actions)
          Expanded(
            child: InkWell(
              onTap: a.onTap,
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Column(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: a.color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(a.icon, color: a.color),
                    ),
                    const SizedBox(height: 6),
                    Text(a.label,
                        textAlign: TextAlign.center,
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textPrimary),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
