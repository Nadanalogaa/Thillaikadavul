import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/event_model.dart';
import '../../../di/injection_container.dart';

/// Events — the same list the web "Events" menu shows.
class EventsListScreen extends StatefulWidget {
  const EventsListScreen({super.key});

  @override
  State<EventsListScreen> createState() => _EventsListScreenState();
}

class _EventsListScreenState extends State<EventsListScreen> {
  List<EventModel> _items = [];
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
      final r = await sl<ApiClient>().getEvents();
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is List) {
        setState(() {
          _items = (r.data as List)
              .whereType<Map>()
              .map((e) => EventModel.fromJson(Map<String, dynamic>.from(e)))
              .where((e) => e.isActive)
              .toList();
        });
      } else {
        setState(() => _error = 'Could not load events.');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load events.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Events'),
        backgroundColor: AppColors.primary,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _Message(text: _error!, onRetry: _load)
              : _items.isEmpty
                  ? const _Message(text: 'No events yet.')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final e = _items[i];
                          final when = [e.eventDate, e.eventTime, e.location]
                              .where((s) => s != null && s.isNotEmpty)
                              .join(' · ');
                          return Card(
                            child: ListTile(
                              leading: const CircleAvatar(
                                backgroundColor: Color(0x1F4F46E5),
                                child: Icon(Icons.event, color: AppColors.primary),
                              ),
                              title: Text(e.title, style: AppTextStyles.labelLarge),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (when.isNotEmpty)
                                    Text(when,
                                        style: AppTextStyles.caption
                                            .copyWith(color: AppColors.primary)),
                                  if (e.description != null && e.description!.isNotEmpty)
                                    Text(e.description!,
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
