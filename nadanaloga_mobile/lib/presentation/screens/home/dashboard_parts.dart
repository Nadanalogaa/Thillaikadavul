import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../data/models/makeup_model.dart';
import '../admin/insights/dashboard_widgets.dart';
import 'home_summary.dart';

// Small building blocks shared by the family and teacher home dashboards.
// The card itself is the admin dashboard's DashPanel, so all three homes
// read as one app.

/// Rounded square with a tinted background and a coloured icon.
class IconBubble extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  const IconBubble(this.icon, this.color, {super.key, this.size = 40});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
      child: Icon(icon, color: color, size: size * 0.52),
    );
  }
}

/// Calendar-leaf date: "16 / NOV" in a tinted block.
class DateBadge extends StatelessWidget {
  final DateTime date;
  final Color color;
  final double size;
  const DateBadge(this.date, this.color, {super.key, this.size = 46});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(monthAbbr(date),
              style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w700,
                  fontSize: 9,
                  letterSpacing: 0.5,
                  height: 1.1)),
          Text('${date.day}',
              style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w800,
                  fontSize: 17,
                  height: 1.15)),
        ],
      ),
    );
  }
}

/// Small coloured chip (state, label).
class TagChip extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;
  final bool solid;
  const TagChip(this.label,
      {super.key, required this.color, this.icon, this.solid = false});

  @override
  Widget build(BuildContext context) {
    final fg = solid ? Colors.white : color;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: solid ? color : color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 3),
          ],
          Flexible(
            child: Text(label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.caption.copyWith(
                    color: fg, fontWeight: FontWeight.w600, fontSize: 11)),
          ),
        ],
      ),
    );
  }
}

/// Section heading (with spacing above) and an optional action.
class HomeSection extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;
  const HomeSection(this.title, {super.key, this.action, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 22),
      child: DashSectionTitle(title, action: action, onAction: onAction),
    );
  }
}

Color attendanceColor(int? pct) {
  if (pct == null) return AppColors.textHint;
  if (pct >= 85) return AppColors.success;
  if (pct >= 70) return AppColors.warning;
  return AppColors.error;
}

/// Circular percentage ring with the number in the middle.
class PercentRing extends StatelessWidget {
  final int? percentage;
  final double size;
  final double stroke;
  const PercentRing(
      {super.key, required this.percentage, this.size = 64, this.stroke = 7});

  @override
  Widget build(BuildContext context) {
    final color = attendanceColor(percentage);
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _RingPainter(
          value: percentage == null ? 0 : percentage!.clamp(0, 100) / 100,
          color: color,
          stroke: stroke,
        ),
        child: Center(
          child: Text(
            percentage == null ? '–' : '$percentage%',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: size * 0.24,
              color: percentage == null
                  ? AppColors.textHint
                  : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double value;
  final Color color;
  final double stroke;
  _RingPainter(
      {required this.value, required this.color, required this.stroke});

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final r = rect.deflate(stroke / 2);
    final bg = Paint()
      ..color = AppColors.divider
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    canvas.drawArc(r, 0, math.pi * 2, false, bg);
    if (value <= 0) return;
    final fg = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = stroke;
    canvas.drawArc(r, -math.pi / 2, math.pi * 2 * value, false, fg);
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.value != value || old.color != color || old.stroke != stroke;
}

(Color, IconData, String) markStyle(String status) {
  switch (status) {
    case 'present':
      return (AppColors.success, Icons.check_rounded, 'Present');
    case 'late':
      return (AppColors.warning, Icons.schedule_rounded, 'Late');
    case 'absent':
      return (AppColors.error, Icons.close_rounded, 'Absent');
    default:
      return (AppColors.textHint, Icons.remove, status);
  }
}

/// Last few classes as coloured dots (oldest left, latest right).
class AttendanceDots extends StatelessWidget {
  final List<RecentMark> recent;
  const AttendanceDots({super.key, required this.recent});

  @override
  Widget build(BuildContext context) {
    final shown = recent.take(6).toList().reversed.toList();
    return Wrap(
      spacing: 5,
      runSpacing: 4,
      children: [
        for (final r in shown)
          Builder(builder: (_) {
            final (c, icon, label) = markStyle(r.status);
            return Tooltip(
              message:
                  '$label${r.date == null ? '' : ' · ${shortDay(r.date!)}'}',
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(color: c, shape: BoxShape.circle),
                child: Icon(icon, size: 13, color: Colors.white),
              ),
            );
          }),
      ],
    );
  }
}

/// Shortcut tile for the quick-action grid.
class HomeAction {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final String? badge;
  const HomeAction(this.icon, this.label, this.color, this.onTap, {this.badge});
}

/// Four-across grid of shortcuts in one panel.
class QuickGrid extends StatelessWidget {
  final List<HomeAction> actions;
  const QuickGrid({super.key, required this.actions});

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < actions.length; i += 4) {
      final slice = actions.skip(i).take(4).toList();
      rows.add(Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var j = 0; j < 4; j++)
            Expanded(
              child:
                  j < slice.length ? _cell(slice[j]) : const SizedBox.shrink(),
            ),
        ],
      ));
    }
    return DashPanel(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      child: Column(children: rows),
    );
  }

  Widget _cell(HomeAction a) {
    return InkWell(
      onTap: a.onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
        child: Column(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        a.color.withValues(alpha: 0.18),
                        a.color.withValues(alpha: 0.08),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(a.icon, color: a.color, size: 23),
                ),
                if (a.badge != null)
                  Positioned(
                    right: -6,
                    top: -5,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1),
                      constraints: const BoxConstraints(minWidth: 18),
                      decoration: BoxDecoration(
                        color: AppColors.error,
                        borderRadius: BorderRadius.circular(10),
                        border:
                            Border.all(color: AppColors.surface, width: 1.5),
                      ),
                      child: Text(a.badge!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700)),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            Text(a.label,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.caption.copyWith(
                    color: AppColors.textPrimary, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}

/// Three big number tiles in a row.
class StatTile {
  final IconData icon;
  final String value;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const StatTile(this.icon, this.value, this.label, this.color, this.onTap);
}

class StatRow extends StatelessWidget {
  final List<StatTile> tiles;
  const StatRow({super.key, required this.tiles});

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < tiles.length; i++) ...[
            if (i > 0) const SizedBox(width: 10),
            Expanded(
              child: DashPanel(
                onTap: tiles[i].onTap,
                padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    IconBubble(tiles[i].icon, tiles[i].color, size: 34),
                    const SizedBox(height: 10),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(tiles[i].value,
                          style: AppTextStyles.h2.copyWith(
                              fontWeight: FontWeight.w800, height: 1.1)),
                    ),
                    const SizedBox(height: 2),
                    Text(tiles[i].label,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textSecondary)),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// A coloured "hero" card for the next class.
class NextClassHero extends StatelessWidget {
  final SummaryClass cls;
  final String? overline;
  final VoidCallback onTap;
  final bool showTeacher;
  final Widget? trailing;
  const NextClassHero({
    super.key,
    required this.cls,
    required this.onTap,
    this.overline,
    this.showTeacher = true,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final base = cls.cancelled
        ? AppColors.textSecondary
        : (cls.courseName.isNotEmpty
            ? AppColors.getCourseColor(cls.courseName)
            : AppColors.primary);
    final dark = Color.lerp(base, Colors.black, 0.25)!;
    final s = cls.start, e = cls.end;
    final live = !cls.cancelled &&
        s != null &&
        e != null &&
        !now.isBefore(s) &&
        now.isBefore(e);
    final meta = [
      if (showTeacher && cls.teacherName.isNotEmpty)
        (Icons.person_outline, cls.teacherName),
      if (cls.place.isNotEmpty)
        (
          cls.isOnline ? Icons.videocam_outlined : Icons.place_outlined,
          cls.place
        ),
    ];
    return Material(
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      color: base,
      child: InkWell(
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [base, dark],
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                right: -18,
                bottom: -22,
                child: Icon(Icons.music_note_rounded,
                    size: 110, color: Colors.white.withValues(alpha: 0.08)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 12, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(live ? Icons.sensors_rounded : Icons.event_rounded,
                            size: 15, color: Colors.white70),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            (overline ?? (live ? 'IN CLASS NOW' : 'NEXT CLASS'))
                                .toUpperCase(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 11,
                                letterSpacing: 0.8,
                                fontWeight: FontWeight.w700),
                          ),
                        ),
                        if (trailing != null) trailing!,
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      cls.countdown(now),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        decoration:
                            cls.cancelled ? TextDecoration.lineThrough : null,
                        decorationColor: Colors.white70,
                      ),
                    ),
                    if (cls.isMakeup && !cls.cancelled) ...[
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFCD34D),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text('Make-up class',
                            style: TextStyle(
                                color: Color(0xFF451A03),
                                fontSize: 11,
                                fontWeight: FontWeight.w800)),
                      ),
                    ],
                    const SizedBox(height: 2),
                    Text(
                      cls.batchName.isEmpty ? cls.courseName : cls.batchName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600),
                    ),
                    if (meta.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (final (icon, text) in meta)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(icon, size: 13, color: Colors.white),
                                  const SizedBox(width: 4),
                                  ConstrainedBox(
                                    constraints:
                                        const BoxConstraints(maxWidth: 200),
                                    child: Text(text,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 12,
                                            fontWeight: FontWeight.w500)),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Horizontal strip of the week's classes; cancelled ones struck through.
class WeekStrip extends StatelessWidget {
  final List<SummaryClass> classes;
  final void Function(SummaryClass) onTap;
  final bool showLearners;
  const WeekStrip(
      {super.key,
      required this.classes,
      required this.onTap,
      this.showLearners = false});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    return SizedBox(
      height: 118,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        itemCount: classes.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, i) {
          final c = classes[i];
          final color = c.cancelled
              ? AppColors.textHint
              : (c.courseName.isNotEmpty
                  ? AppColors.getCourseColor(c.courseName)
                  : AppColors.primary);
          final word = c.dayWord(now);
          final isToday = word == 'Today';
          final d = c.date;
          return SizedBox(
            width: 150,
            child: DashPanel(
              onTap: () => onTap(c),
              border:
                  isToday && !c.cancelled ? color.withValues(alpha: 0.5) : null,
              padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
              child: Opacity(
                opacity: c.cancelled ? 0.7 : 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                              color: color, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            isToday || word == 'Tomorrow' || d == null
                                ? word
                                : '${weekdayAbbr(d)} ${d.day}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.caption.copyWith(
                                color:
                                    isToday ? color : AppColors.textSecondary,
                                fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      clock12(c.startTime).isEmpty
                          ? 'Time TBA'
                          : clock12(c.startTime),
                      style: AppTextStyles.labelLarge.copyWith(
                        fontWeight: FontWeight.w700,
                        decoration:
                            c.cancelled ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    Text(
                      c.batchName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textPrimary,
                        decoration:
                            c.cancelled ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    const Spacer(),
                    if (c.cancelled)
                      const TagChip('Cancelled',
                          color: AppColors.error,
                          icon: Icons.event_busy_outlined)
                    else if (c.isMakeup)
                      const TagChip('Make-up',
                          color: makeupIndigo, icon: Icons.event_repeat_rounded)
                    else
                      Text(
                        showLearners && c.learners.isNotEmpty
                            ? c.learners.join(' & ')
                            : (c.place.isNotEmpty ? c.place : c.courseName),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.caption.copyWith(
                            color: color, fontWeight: FontWeight.w600),
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

const Color makeupIndigo = Color(0xFF4F46E5);
const Color makeupAmber = Color(0xFFB45309);

/// One open make-up class: "Make-up class owed" (amber) until the academy
/// fixes a date, then "Make-up class · Mon, 9 Nov, 5:30 PM–6:30 PM" (indigo).
/// [family] wording tells parents the academy will let them know.
class MakeupCard extends StatelessWidget {
  final MakeupRow row;
  final bool family;
  final VoidCallback? onTap;
  const MakeupCard(
      {super.key, required this.row, this.family = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    final owed = row.isOwed;
    final color = owed ? makeupAmber : makeupIndigo;
    final reason = row.cancelReason == null ? '' : ' (${row.cancelReason})';
    return Material(
      color: color.withValues(alpha: 0.06),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IconBubble(Icons.event_repeat_rounded, color, size: 36),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      owed
                          ? 'Make-up class owed'
                          : 'Make-up class · ${row.when}',
                      style: AppTextStyles.labelLarge
                          .copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${row.batchName} · class cancelled on '
                      '${makeupShortDate(row.cancelledDate)}$reason',
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary),
                    ),
                    if (owed) ...[
                      const SizedBox(height: 2),
                      Text(
                        family
                            ? 'The academy will tell you the new date and time.'
                            : 'The academy will fix the date.',
                        style: AppTextStyles.caption.copyWith(
                            color: color, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ],
                ),
              ),
              if (onTap != null)
                const Icon(Icons.chevron_right, color: AppColors.textHint),
            ],
          ),
        ),
      ),
    );
  }
}

const Color cancelledRose = Color(0xFFB91C1C);

/// Red band(s) at the top of home for classes called off in the coming days:
/// "Class cancelled · Tue, 10 Nov · 6:00 PM", then "Batch — reason".
class CancelledBand extends StatelessWidget {
  final List<CancelledNotice> notices;
  const CancelledBand({super.key, required this.notices});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < notices.length; i++)
          Container(
            margin: EdgeInsets.only(top: i == 0 ? 0 : 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFECACA)),
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2)),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const IconBubble(Icons.event_busy_rounded, cancelledRose,
                    size: 36),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(notices[i].title(now),
                          style: AppTextStyles.labelLarge.copyWith(
                              color: const Color(0xFF991B1B),
                              fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text(notices[i].subtitle,
                          style: AppTextStyles.caption
                              .copyWith(color: cancelledRose)),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// A child's open make-up inside the attendance section of their card:
/// "Class on Tue, 10 Nov was cancelled by the academy (reason)", then
/// "Make-up: owed — the academy will tell you the date" or
/// "Make-up: Sat, 15 Nov, 5:00 PM–6:00 PM".
class MakeupAttendanceLine extends StatelessWidget {
  final MakeupRow row;
  const MakeupAttendanceLine({super.key, required this.row});

  @override
  Widget build(BuildContext context) {
    final owed = row.isOwed;
    final color = owed ? makeupAmber : makeupIndigo;
    final reason = row.cancelReason == null ? '' : ' (${row.cancelReason})';
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Icon(Icons.event_repeat_rounded, size: 18, color: color),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Class on ${makeupDayLabel(row.cancelledDate)} was cancelled '
                  'by the academy$reason',
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textPrimary),
                ),
                const SizedBox(height: 2),
                Text(
                  owed
                      ? 'Make-up: owed — the academy will tell you the date'
                      : 'Make-up: ${row.when}',
                  style: AppTextStyles.caption
                      .copyWith(color: color, fontWeight: FontWeight.w700),
                ),
                Text(row.batchName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.textHint)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A list of rows inside one panel, separated by hairlines.
class RowsPanel extends StatelessWidget {
  final List<Widget> rows;
  final Color? border;
  const RowsPanel({super.key, required this.rows, this.border});

  @override
  Widget build(BuildContext context) {
    return DashPanel(
      padding: const EdgeInsets.symmetric(vertical: 4),
      border: border,
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0)
              const Divider(
                  height: 1,
                  indent: 14,
                  endIndent: 14,
                  color: AppColors.divider),
            rows[i],
          ],
        ],
      ),
    );
  }
}

/// One tappable row: leading, title, subtitle, trailing.
class InfoRow extends StatelessWidget {
  final Widget leading;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final int subtitleLines;
  const InfoRow({
    super.key,
    required this.leading,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.subtitleLines = 1,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
        child: Row(
          children: [
            leading,
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.labelLarge),
                  if (subtitle != null && subtitle!.isNotEmpty)
                    Text(subtitle!,
                        maxLines: subtitleLines,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textSecondary)),
                ],
              ),
            ),
            trailing ??
                (onTap == null
                    ? const SizedBox(width: 6)
                    : const Icon(Icons.chevron_right,
                        color: AppColors.textHint)),
          ],
        ),
      ),
    );
  }
}

/// Celebratory banner for a birthday this week.
class BirthdayBanner extends StatelessWidget {
  final String name;
  final int inDays;
  final int? turns;
  final DateTime? date;
  final VoidCallback? onTap;
  const BirthdayBanner({
    super.key,
    required this.name,
    required this.inDays,
    this.turns,
    this.date,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final first = name.trim().split(RegExp(r'\s+')).first;
    final title = inDays == 0
        ? 'Happy birthday, $first!'
        : inDays == 1
            ? "$first's birthday is tomorrow"
            : "$first's birthday in $inDays days";
    final sub = [
      if (turns != null && turns! > 0) 'Turns $turns',
      if (date != null && inDays > 0) weekdayDay(date!),
      if (inDays == 0) 'Wishing a wonderful year of music and dance',
    ].join(' · ');
    return Material(
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Ink(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFFF7EB3), Color(0xFFFFB86C)],
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                right: -4,
                top: -8,
                child: Icon(Icons.celebration_rounded,
                    size: 60, color: Colors.white.withValues(alpha: 0.16)),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.25),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.cake_rounded,
                          color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800)),
                          if (sub.isNotEmpty)
                            Text(sub,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    color: Colors.white, fontSize: 12)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Muted card saying a section could not load, with Retry.
class SectionError extends StatelessWidget {
  final String text;
  final VoidCallback onRetry;
  const SectionError({super.key, required this.text, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return DashPanel(
      border: AppColors.error.withValues(alpha: 0.3),
      padding: const EdgeInsets.fromLTRB(14, 8, 6, 8),
      child: Row(
        children: [
          const Icon(Icons.cloud_off_outlined,
              color: AppColors.error, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text,
                style: AppTextStyles.bodySmall
                    .copyWith(color: AppColors.textSecondary)),
          ),
          TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

/// Grey placeholder block while a section loads.
class SkeletonBlock extends StatelessWidget {
  final double height;
  const SkeletonBlock(this.height, {super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      margin: const EdgeInsets.only(top: 12),
      decoration: BoxDecoration(
        color: AppColors.divider.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(16),
      ),
    );
  }
}

/// Muted one-line state ("All attendance marked").
class CalmLine extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  final VoidCallback? onTap;
  const CalmLine(
      {super.key,
      required this.icon,
      required this.text,
      this.color = AppColors.textSecondary,
      this.onTap});

  @override
  Widget build(BuildContext context) {
    return DashPanel(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          IconBubble(icon, color, size: 34),
          const SizedBox(width: 12),
          Expanded(
            child: Text(text,
                style: AppTextStyles.bodyMedium
                    .copyWith(color: AppColors.textPrimary)),
          ),
        ],
      ),
    );
  }
}

Future<void> dialNumber(String number) async {
  final uri =
      Uri(scheme: 'tel', path: number.replaceAll(RegExp(r'[^0-9+]'), ''));
  if (await canLaunchUrl(uri)) await launchUrl(uri);
}

/// Round call button.
class CallButton extends StatelessWidget {
  final String phone;
  const CallButton(this.phone, {super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Call $phone',
      onPressed: () => dialNumber(phone),
      style: IconButton.styleFrom(
        backgroundColor: AppColors.success.withValues(alpha: 0.12),
        foregroundColor: AppColors.success,
      ),
      icon: const Icon(Icons.call_rounded, size: 20),
    );
  }
}
