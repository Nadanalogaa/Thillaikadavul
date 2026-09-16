import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/grade_exam_model.dart';
import '../../../di/injection_container.dart';

/// Grade Exams — the same list the web "Grade Exams" menu shows.
/// Exams addressed to specific students are only shown to [studentId].
class GradeExamsListScreen extends StatefulWidget {
  final int? studentId;
  const GradeExamsListScreen({super.key, this.studentId});

  @override
  State<GradeExamsListScreen> createState() => _GradeExamsListScreenState();
}

class _GradeExamsListScreenState extends State<GradeExamsListScreen> {
  List<GradeExamModel> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await sl<ApiClient>().getGradeExams();
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is List) {
        final sid = widget.studentId;
        setState(() {
          _items = (r.data as List)
              .whereType<Map>()
              .map((e) => GradeExamModel.fromJson(Map<String, dynamic>.from(e)))
              .where((e) =>
                  e.recipientIds == null ||
                  e.recipientIds!.isEmpty ||
                  (sid != null && e.recipientIds!.contains(sid)))
              .toList();
        });
      } else {
        setState(() => _error = 'Could not load exams.');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load exams.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Grade Exams'),
        backgroundColor: AppColors.primary,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _Message(text: _error!, onRetry: _load)
              : _items.isEmpty
                  ? const _Message(text: 'No exams scheduled.')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final e = _items[i];
                          final when = [
                            e.course,
                            [e.examDate, e.examTime]
                                .where((s) => s != null && s.isNotEmpty)
                                .join(' '),
                            e.location,
                          ].where((s) => s != null && s.isNotEmpty).join(' · ');
                          return Card(
                            child: ListTile(
                              leading: const CircleAvatar(
                                backgroundColor: Color(0x1F4F46E5),
                                child: Icon(Icons.quiz, color: AppColors.primary),
                              ),
                              title: Text(e.examName, style: AppTextStyles.labelLarge),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (when.isNotEmpty)
                                    Text(when,
                                        style: AppTextStyles.caption
                                            .copyWith(color: AppColors.primary)),
                                  if (e.syllabus != null && e.syllabus!.isNotEmpty)
                                    Text(e.syllabus!,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: AppTextStyles.caption.copyWith(
                                            color: AppColors.textSecondary)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

class _Message extends StatelessWidget {
  final String text;
  final VoidCallback? onRetry;
  const _Message({required this.text, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(text,
              style: AppTextStyles.bodyMedium
                  .copyWith(color: AppColors.textSecondary)),
          if (onRetry != null)
            TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
