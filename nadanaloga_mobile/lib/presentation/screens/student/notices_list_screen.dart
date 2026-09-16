import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/notice_model.dart';
import '../../../di/injection_container.dart';

/// Notices — the same list the web "Notice" menu shows.
class NoticesListScreen extends StatefulWidget {
  const NoticesListScreen({super.key});

  @override
  State<NoticesListScreen> createState() => _NoticesListScreenState();
}

class _NoticesListScreenState extends State<NoticesListScreen> {
  List<NoticeModel> _items = [];
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
      final r = await sl<ApiClient>().getNotices();
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is List) {
        setState(() {
          _items = (r.data as List)
              .whereType<Map>()
              .map((n) => NoticeModel.fromJson(Map<String, dynamic>.from(n)))
              .where((n) => n.isActive)
              .toList();
        });
      } else {
        setState(() => _error = 'Could not load notices.');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load notices.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _priorityColor(String? p) {
    switch ((p ?? '').toLowerCase()) {
      case 'high':
      case 'urgent':
        return AppColors.error;
      case 'medium':
        return AppColors.warning;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notice'),
        backgroundColor: AppColors.primary,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _Message(text: _error!, onRetry: _load)
              : _items.isEmpty
                  ? const _Message(text: 'No notices yet.')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final n = _items[i];
                          return Card(
                            child: ListTile(
                              leading: const CircleAvatar(
                                backgroundColor: Color(0x1F4F46E5),
                                child: Icon(Icons.campaign, color: AppColors.primary),
                              ),
                              title: Text(n.title, style: AppTextStyles.labelLarge),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (n.category != null && n.category!.isNotEmpty)
                                    Text(n.category!,
                                        style: AppTextStyles.caption
                                            .copyWith(color: AppColors.primary)),
                                  if (n.content != null && n.content!.isNotEmpty)
                                    Text(n.content!,
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                        style: AppTextStyles.caption.copyWith(
                                            color: AppColors.textSecondary)),
                                ],
                              ),
                              trailing: (n.priority != null && n.priority!.isNotEmpty)
                                  ? Text(n.priority!,
                                      style: AppTextStyles.caption.copyWith(
                                          color: _priorityColor(n.priority),
                                          fontWeight: FontWeight.w600))
                                  : null,
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
