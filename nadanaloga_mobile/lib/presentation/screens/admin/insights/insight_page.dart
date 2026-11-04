import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import 'insights_data.dart';

/// Shared frame for the simple insight lists: loads /api/admin/insights,
/// shows a spinner / error-with-retry, and gives the body pull-to-refresh.
class InsightPage<T> extends StatefulWidget {
  final String title;
  final T Function(AdminInsights) select;

  /// Builds the list items. `reload` refetches (e.g. after an action).
  final List<Widget> Function(
      BuildContext context, T data, Future<void> Function() reload) build;
  final List<Widget>? actions;

  const InsightPage({
    super.key,
    required this.title,
    required this.select,
    required this.build,
    this.actions,
  });

  @override
  State<InsightPage<T>> createState() => _InsightPageState<T>();
}

class _InsightPageState<T> extends State<InsightPage<T>> {
  T? _data;
  String? _error;
  bool _loading = true;

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
      final d = await AdminInsights.load();
      if (!mounted) return;
      setState(() {
        _data = widget.select(d);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = _data;
    Widget body;
    if (d == null) {
      body = _loading
          ? const Center(child: CircularProgressIndicator())
          : InsightError(message: _error ?? 'Could not load.', onRetry: _load);
    } else {
      body = RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: widget.build(context, d, _load),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: widget.actions,
        bottom: (_loading && d != null)
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2),
              )
            : null,
      ),
      body: body,
    );
  }
}

/// Plain rounded row card used across the insight lists.
class InsightRowCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final Color? borderColor;
  const InsightRowCard(
      {super.key, required this.child, this.onTap, this.borderColor});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: borderColor ?? AppColors.divider),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
          child: child,
        ),
      ),
    );
  }
}

/// Section heading inside an insight list.
class InsightHeading extends StatelessWidget {
  final String text;
  final String? trailing;
  const InsightHeading(this.text, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(text,
                style: AppTextStyles.h4,
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ),
          if (trailing != null) Text(trailing!, style: AppTextStyles.caption),
        ],
      ),
    );
  }
}

/// Centred grey message for an empty list.
class InsightEmpty extends StatelessWidget {
  final String text;
  const InsightEmpty(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Center(
        child: Text(text,
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMedium
                .copyWith(color: AppColors.textSecondary)),
      ),
    );
  }
}

/// Name + optional second line, with a phone link underneath.
class PersonLines extends StatelessWidget {
  final String name;
  final String? sub;
  final String? phone;
  final Widget? trailing;
  const PersonLines(
      {super.key, required this.name, this.sub, this.phone, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name,
                  style: AppTextStyles.labelLarge,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
              if (sub != null && sub!.isNotEmpty)
                Text(sub!,
                    style: AppTextStyles.caption,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
              if (phone != null) PhoneLink(phone),
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 8), trailing!],
      ],
    );
  }
}
