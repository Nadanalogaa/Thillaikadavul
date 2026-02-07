import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/batch_model.dart';
import '../../../../di/injection_container.dart';

class TransferStudentSheet extends StatefulWidget {
  final String studentName;
  final int currentBatchId;
  final int? courseId;

  const TransferStudentSheet({
    super.key,
    required this.studentName,
    required this.currentBatchId,
    this.courseId,
  });

  @override
  State<TransferStudentSheet> createState() => _TransferStudentSheetState();
}

class _TransferStudentSheetState extends State<TransferStudentSheet> {
  List<BatchModel> _batches = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadBatches();
  }

  Future<void> _loadBatches() async {
    try {
      final response = await sl<ApiClient>().getBatches();
      if (response.statusCode == 200) {
        final all = (response.data as List)
            .map((j) => BatchModel.fromJson(j))
            .toList();
        _batches = all.where((b) =>
            b.id != widget.currentBatchId &&
            (widget.courseId == null || b.courseId == widget.courseId)
        ).toList();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Transfer ${widget.studentName}', style: AppTextStyles.h3),
          const SizedBox(height: 4),
          Text(
            'Select destination batch:',
            style: AppTextStyles.bodyMedium
                .copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_batches.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'No other batches available',
                  style: AppTextStyles.bodyMedium
                      .copyWith(color: AppColors.textSecondary),
                ),
              ),
            )
          else
            ...List.generate(_batches.length, (index) {
              final batch = _batches[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: const Icon(Icons.group_work,
                      color: AppColors.primary),
                  title: Text(batch.batchName,
                      style: AppTextStyles.labelLarge),
                  subtitle: Text(
                    '${batch.allStudentIds.length} students${batch.mode != null ? ' · ${batch.mode}' : ''}',
                    style: AppTextStyles.caption,
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () => Navigator.pop(context, batch.id),
                ),
              );
            }),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
