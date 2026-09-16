import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/book_material_model.dart';
import '../../../di/injection_container.dart';

/// Book Materials — the same list the web "Book Materials" menu shows.
/// Materials addressed to specific students are only shown to [studentId].
class BookMaterialsListScreen extends StatefulWidget {
  final int? studentId;
  const BookMaterialsListScreen({super.key, this.studentId});

  @override
  State<BookMaterialsListScreen> createState() => _BookMaterialsListScreenState();
}

class _BookMaterialsListScreenState extends State<BookMaterialsListScreen> {
  List<BookMaterialModel> _items = [];
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
      final r = await sl<ApiClient>().getBookMaterials();
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is List) {
        final sid = widget.studentId;
        setState(() {
          _items = (r.data as List)
              .whereType<Map>()
              .map((m) => BookMaterialModel.fromJson(Map<String, dynamic>.from(m)))
              .where((m) =>
                  m.recipientIds == null ||
                  m.recipientIds!.isEmpty ||
                  (sid != null && m.recipientIds!.contains(sid)))
              .toList();
        });
      } else {
        setState(() => _error = 'Could not load materials.');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load materials.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(String url) async {
    final full = url.startsWith('http') ? url : '${ApiEndpoints.baseUrl}$url';
    final uri = Uri.tryParse(full);
    if (uri == null) return;
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Could not open this file.'),
        backgroundColor: AppColors.error,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Book Materials'),
        backgroundColor: AppColors.primary,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _Message(text: _error!, onRetry: _load)
              : _items.isEmpty
                  ? const _Message(text: 'No materials yet.')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final m = _items[i];
                          final sub = [m.course, m.description]
                              .where((s) => s != null && s.isNotEmpty)
                              .join(' · ');
                          final hasFile = m.fileUrl != null && m.fileUrl!.isNotEmpty;
                          return Card(
                            child: ListTile(
                              leading: const CircleAvatar(
                                backgroundColor: Color(0x1F4F46E5),
                                child: Icon(Icons.menu_book, color: AppColors.primary),
                              ),
                              title: Text(m.title, style: AppTextStyles.labelLarge),
                              subtitle: sub.isEmpty
                                  ? null
                                  : Text(sub,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTextStyles.caption.copyWith(
                                          color: AppColors.textSecondary)),
                              trailing: hasFile
                                  ? const Icon(Icons.open_in_new,
                                      color: AppColors.primary)
                                  : null,
                              onTap: hasFile ? () => _open(m.fileUrl!) : null,
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
