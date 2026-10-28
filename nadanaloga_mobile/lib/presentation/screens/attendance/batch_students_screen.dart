import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../di/injection_container.dart';

/// The students in one of a teacher's batches: name, parent, phone to tap,
/// and the grade in this course. Read-only; the admin changes membership.
class BatchStudentsScreen extends StatefulWidget {
  final int batchId;
  final String batchName;

  const BatchStudentsScreen({
    super.key,
    required this.batchId,
    required this.batchName,
  });

  @override
  State<BatchStudentsScreen> createState() => _BatchStudentsScreenState();
}

class _BatchStudentsScreenState extends State<BatchStudentsScreen> {
  bool _loading = true;
  String? _error;
  String? _courseName;
  List<Map<String, dynamic>> _students = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final r = await sl<ApiClient>().getBatchDetails(widget.batchId);
      final code = r.statusCode ?? 0;
      if (code < 200 || code >= 300 || r.data is! Map) {
        setState(() {
          _error = r.data is Map && r.data['message'] is String
              ? r.data['message'] as String
              : 'Could not load the students.';
          _loading = false;
        });
        return;
      }
      final d = Map<String, dynamic>.from(r.data as Map);
      setState(() {
        _courseName = d['course_name'] as String?;
        _students = ((d['students'] as List?) ?? const [])
            .whereType<Map>()
            .map((s) => Map<String, dynamic>.from(s))
            .toList();
        _loading = false;
      });
    } catch (_) {
      setState(() { _error = 'Connection error. Please try again.'; _loading = false; });
    }
  }

  Future<void> _dial(String number) async {
    final uri = Uri(scheme: 'tel', path: number);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.batchName),
        bottom: _courseName == null
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(22),
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(
                    '$_courseName · ${_students.length} ${_students.length == 1 ? 'student' : 'students'}',
                    style: AppTextStyles.caption.copyWith(color: Colors.white70),
                  ),
                ),
              ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _centered(_error!, onRetry: _load)
              : _students.isEmpty
                  ? _centered('No students in this batch yet.')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _students.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, i) => _studentCard(_students[i]),
                      ),
                    ),
    );
  }

  Widget _studentCard(Map<String, dynamic> s) {
    final name = '${s['name'] ?? 'Student'}';
    final parent = '${s['parent_name'] ?? ''}'.trim();
    final phone = '${s['contact_number'] ?? ''}'.trim();
    final grade = '${s['grade'] ?? ''}'.trim();
    final mode = '${s['class_preference'] ?? ''}'.trim();
    final meta = [if (grade.isNotEmpty) grade, if (mode.isNotEmpty) mode].join(' · ');
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: AppColors.primary.withValues(alpha: 0.12),
              child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: AppTextStyles.labelLarge),
                  if (parent.isNotEmpty)
                    Text('Parent: $parent', style: AppTextStyles.caption),
                  if (meta.isNotEmpty)
                    Text(meta,
                        style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                ],
              ),
            ),
            if (phone.isNotEmpty)
              IconButton(
                tooltip: 'Call $phone',
                icon: const Icon(Icons.phone, color: AppColors.primary),
                onPressed: () => _dial(phone),
              ),
          ],
        ),
      ),
    );
  }

  Widget _centered(String text, {VoidCallback? onRetry}) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(text, textAlign: TextAlign.center, style: AppTextStyles.bodyMedium),
              if (onRetry != null) ...[
                const SizedBox(height: 12),
                OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
              ],
            ],
          ),
        ),
      );
}
