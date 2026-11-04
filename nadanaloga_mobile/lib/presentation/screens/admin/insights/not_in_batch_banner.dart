import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import 'insights_data.dart';

/// "N students not in a batch" strip for the batches screen; opens the
/// Not-in-a-batch list. Hidden while loading, on error and when N is 0.
class NotInBatchBanner extends StatefulWidget {
  const NotInBatchBanner({super.key});

  @override
  State<NotInBatchBanner> createState() => NotInBatchBannerState();
}

class NotInBatchBannerState extends State<NotInBatchBanner> {
  @override
  void initState() {
    super.initState();
    reload();
  }

  Future<void> reload() async {
    try {
      // Updates AdminInsights.notInBatchCount, which this banner shows.
      await AdminInsights.load();
    } catch (_) {
      // Leave the last count; the banner is a hint, not essential.
    }
  }

  Future<void> _open() async {
    await context.push('/admin/insights/not-in-batch');
    if (mounted) reload();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: AdminInsights.notInBatchCount,
      builder: (context, count, _) => _banner(count),
    );
  }

  Widget _banner(int count) {
    if (count <= 0) return const SizedBox.shrink();
    const color = AppColors.studentAccent;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      child: Material(
        color: color.withValues(alpha: 0.08),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: color.withValues(alpha: 0.25)),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: _open,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                const Icon(Icons.group_off_outlined, color: color, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '$count ${count == 1 ? 'student' : 'students'} not in a batch',
                    style: AppTextStyles.labelLarge.copyWith(color: color),
                  ),
                ),
                Text('View',
                    style: AppTextStyles.bodySmall.copyWith(
                        color: color, fontWeight: FontWeight.w600)),
                const Icon(Icons.chevron_right, color: color, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
