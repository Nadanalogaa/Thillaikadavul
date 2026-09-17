import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/utils/fee_format.dart';
import '../../../data/models/batch_model.dart';
import '../student/household_fees_screen.dart';
import 'class_schedule.dart';
import 'home_data.dart';
import 'home_widgets.dart';

/// One student's details, opened from a family row on the home dashboard:
/// this month's fees, courses and grades, classes with timings, exams.
class MemberDetailScreen extends StatelessWidget {
  final HouseholdMember member;
  final HomeData data;
  final Color accent;

  const MemberDetailScreen({
    super.key,
    required this.member,
    required this.data,
    required this.accent,
  });

  void _openFees(BuildContext context) => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const HouseholdFeesScreen()),
      );

  @override
  Widget build(BuildContext context) {
    final batches = data.batchesOf(member.id);
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day);
    final exams = data.exams.where((x) {
      final forMember = x.recipientIds == null ||
          x.recipientIds!.isEmpty ||
          x.recipientIds!.contains(member.id);
      final date = (x.examDate == null || x.examDate!.length < 10)
          ? null
          : DateTime.tryParse(x.examDate!.substring(0, 10));
      return forMember && date != null && !date.isBefore(start);
    }).toList()
      ..sort((a, b) => a.examDate!.compareTo(b.examDate!));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(member.name),
        backgroundColor: accent,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          _profileCard(batches),
          const HomeSectionTitle('Fees this month'),
          _feesCard(context),
          const HomeSectionTitle('Courses & grades'),
          _coursesCard(),
          const HomeSectionTitle('Classes'),
          if (batches.isEmpty)
            const HomeEmptyLine(
              icon: Icons.hourglass_empty,
              text: 'Awaiting batch. The academy will assign one soon.',
            )
          else
            for (final b in batches) _batchCard(b),
          if (exams.isNotEmpty) ...[
            const HomeSectionTitle('Upcoming exams'),
            HomeCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  for (var i = 0; i < exams.length; i++) ...[
                    if (i > 0)
                      const Divider(
                          height: 1, indent: 16, endIndent: 16, color: AppColors.divider),
                    ListTile(
                      leading: const Icon(Icons.quiz_outlined,
                          color: AppColors.warning),
                      title: Text(exams[i].examName,
                          style: AppTextStyles.labelLarge),
                      subtitle: Text(
                        [
                          FeeFormat.shortDate(exams[i].examDate),
                          exams[i].examTime,
                          exams[i].location,
                        ].where((v) => v != null && v.isNotEmpty).join(' · '),
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textSecondary),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _profileCard(List<BatchModel> batches) {
    final weekly = ClassSchedule.weeklyClassCount(batches);
    return HomeCard(
      child: Row(
        children: [
          InitialsAvatar(member.name, size: 56),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(member.name,
                    style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    StatusPill(member.isChild ? 'Child' : 'Student',
                        color: AppColors.studentAccent),
                    StatusPill(
                        '${member.courseLabels.length} '
                        '${member.courseLabels.length == 1 ? 'course' : 'courses'}',
                        color: AppColors.primary),
                    if (weekly > 0)
                      StatusPill('$weekly ${weekly == 1 ? 'class' : 'classes'}/week',
                          color: AppColors.teacherAccent),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _feesCard(BuildContext context) {
    final f = data.feesFor(member.id);
    if (!f.hasBill) {
      return HomeEmptyLine(
        icon: Icons.receipt_long_outlined,
        text: 'No bill for ${data.period} yet.',
      );
    }
    final paid = f.allPaid;
    final color = paid ? AppColors.success : AppColors.warning;
    return HomeCard(
      borderColor: color.withValues(alpha: 0.35),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(paid ? 'Paid for ${data.period}' : 'Due for ${data.period}',
                    style: AppTextStyles.bodySmall
                        .copyWith(color: AppColors.textSecondary)),
                Text(FeeFormat.rupees(paid ? f.paid : f.due),
                    style: AppTextStyles.h2.copyWith(
                        fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                if (!paid && f.paid > 0)
                  Text('${FeeFormat.rupees(f.paid)} already paid',
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary)),
              ],
            ),
          ),
          paid
              ? OutlinedButton(
                  onPressed: () => _openFees(context),
                  child: const Text('Receipts'),
                )
              : FilledButton(
                  onPressed: () => _openFees(context),
                  style: FilledButton.styleFrom(backgroundColor: accent),
                  child: const Text('Pay now'),
                ),
        ],
      ),
    );
  }

  Widget _coursesCard() {
    final graded = member.courses;
    final gradedNames = graded.map((c) => c.course.trim().toLowerCase()).toSet();
    final ungraded = member.registeredCourses
        .where((r) => !gradedNames.contains(r.trim().toLowerCase()))
        .toList();
    if (graded.isEmpty && ungraded.isEmpty) {
      return const HomeEmptyLine(
          icon: Icons.menu_book_outlined, text: 'No courses yet.');
    }
    final rows = <Widget>[
      for (final c in graded)
        _courseRow(
          c.course,
          c.grade == null || c.grade!.isEmpty ? 'Grade not set' : c.grade!,
          trailing: c.monthlyFee <= 0
              ? null
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('${FeeFormat.rupees(c.netAmount)}/month',
                        style: AppTextStyles.labelLarge),
                    if (c.discountPercentage > 0)
                      Text(
                          '${c.discountPercentage.toStringAsFixed(c.discountPercentage % 1 == 0 ? 0 : 1)}% off '
                          '${FeeFormat.rupees(c.monthlyFee)}',
                          style: AppTextStyles.caption
                              .copyWith(color: AppColors.success)),
                  ],
                ),
        ),
      for (final name in ungraded) _courseRow(name, 'Grade not set yet'),
    ];
    return HomeCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0)
              const Divider(
                  height: 1, indent: 16, endIndent: 16, color: AppColors.divider),
            rows[i],
          ],
        ],
      ),
    );
  }

  Widget _courseRow(String course, String grade, {Widget? trailing}) {
    final color = AppColors.getCourseColor(course);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.music_note_outlined, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(course, style: AppTextStyles.labelLarge),
                Text(grade,
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.textSecondary)),
              ],
            ),
          ),
          if (trailing != null) trailing,
        ],
      ),
    );
  }

  Widget _batchCard(BatchModel b) {
    final course = data.courseNameOf(b);
    final timings = ClassSchedule.timingLines(b);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: HomeCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                    child: Text(b.batchName, style: AppTextStyles.labelLarge)),
                if (b.mode != null && b.mode!.isNotEmpty)
                  StatusPill(b.mode!, color: AppColors.info),
              ],
            ),
            if (course.isNotEmpty)
              Text(course,
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary)),
            const SizedBox(height: 8),
            if (timings.isEmpty)
              Text('Timings to be announced',
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary))
            else
              for (final t in timings)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Row(
                    children: [
                      const Icon(Icons.schedule,
                          size: 15, color: AppColors.textSecondary),
                      const SizedBox(width: 6),
                      Expanded(child: Text(t, style: AppTextStyles.bodySmall)),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }
}
