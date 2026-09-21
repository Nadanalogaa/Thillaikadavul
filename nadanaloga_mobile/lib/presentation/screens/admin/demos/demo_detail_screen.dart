import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/demo_booking_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/demo_booking/demo_booking_bloc.dart';
import '../../../bloc/demo_booking/demo_booking_event.dart';
import '../../../bloc/demo_booking/demo_booking_state.dart';
import '../../../widgets/confirm_dialog.dart';
import 'demo_share.dart';
import 'demo_whatsapp.dart';

class DemoDetailScreen extends StatefulWidget {
  final int bookingId;

  const DemoDetailScreen({super.key, required this.bookingId});

  @override
  State<DemoDetailScreen> createState() => _DemoDetailScreenState();
}

class _DemoDetailScreenState extends State<DemoDetailScreen> {
  bool _loading = true;
  DemoBookingModel? _booking;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final api = sl<ApiClient>();
      final response = await api.getDemoBookings();
      if (response.statusCode == 200 && response.data != null) {
        final all = (response.data as List)
            .map((j) => DemoBookingModel.fromJson(j))
            .toList();
        _booking = all.where((b) => b.id == widget.bookingId).firstOrNull;
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'confirmed':
        return AppColors.primary;
      case 'completed':
        return AppColors.success;
      case 'cancelled':
        return AppColors.error;
      default:
        return Colors.grey;
    }
  }

  /// Confirm, optionally with the demo date and time (both pickers can be
  /// dismissed — the booking is then confirmed without a slot).
  Future<void> _confirm() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      helpText: 'Demo date (optional)',
      initialDate: now,
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 365)),
    );
    TimeOfDay? time;
    if (date != null && mounted) {
      time = await showTimePicker(
        context: context,
        helpText: 'Demo time (optional)',
        initialTime: const TimeOfDay(hour: 17, minute: 0),
      );
    }
    if (!mounted) return;
    String two(int n) => n.toString().padLeft(2, '0');
    context.read<DemoBookingBloc>().add(
          UpdateDemoBooking(id: widget.bookingId, data: {
            'status': 'confirmed',
            if (date != null)
              'scheduled_date': '${date.year}-${two(date.month)}-${two(date.day)}',
            if (time != null)
              'scheduled_time': '${two(time.hour)}:${two(time.minute)}',
          }),
        );
  }

  Future<void> _whatsApp(String kind) async {
    if (_booking == null) return;
    final sent = await sendDemoWhatsApp(context, _booking!, kind);
    if (sent && mounted) _loadData();
  }

  void _complete() {
    context.read<DemoBookingBloc>().add(
          UpdateDemoBooking(id: widget.bookingId, data: {'status': 'completed'}),
        );
  }

  Future<void> _cancel() async {
    final confirmed = await ConfirmDialog.show(
      context,
      title: 'Cancel Demo Booking',
      message: 'Are you sure you want to cancel this demo booking?',
      confirmLabel: 'Cancel Booking',
      confirmColor: AppColors.error,
    );
    if (confirmed == true && mounted) {
      context.read<DemoBookingBloc>().add(
            UpdateDemoBooking(
                id: widget.bookingId, data: {'status': 'cancelled'}),
          );
    }
  }

  Widget _buildInfoRow(IconData icon, String label, String? value) {
    if (value == null || value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: AppTextStyles.caption),
                const SizedBox(height: 2),
                Text(value, style: AppTextStyles.bodyMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard(String title, List<Widget> children) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: AppTextStyles.labelLarge),
            const Divider(),
            ...children,
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<DemoBookingBloc, DemoBookingState>(
      listener: (context, state) {
        if (state is DemoBookingOperationSuccess) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message)));
          context.pop();
        } else if (state is DemoBookingError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Demo Booking Details'),
          actions: [
            if (_booking != null)
              IconButton(
                tooltip: 'Share',
                icon: const Icon(Icons.share),
                onPressed: () => showDemoShareSheet(context, [_booking!]),
              ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _booking == null
                ? const Center(child: Text('Booking not found'))
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Status card
                        Card(
                          margin: const EdgeInsets.only(bottom: 16),
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Center(
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 20, vertical: 10),
                                decoration: BoxDecoration(
                                  color: _statusColor(_booking!.status)
                                      .withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  (_booking!.status ?? 'unknown').toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: _statusColor(_booking!.status),
                                    letterSpacing: 1.2,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),

                        // Student Info card
                        _buildCard('Student Information', [
                          _buildInfoRow(Icons.person, 'Student Name',
                              _booking!.studentName),
                          _buildInfoRow(Icons.family_restroom, 'Parent Name',
                              _booking!.parentName),
                          _buildInfoRow(
                              Icons.email_outlined, 'Email', _booking!.email),
                          _buildInfoRow(
                              Icons.phone_outlined, 'Phone', _booking!.phone),
                          _buildInfoRow(Icons.public, 'Country',
                              _booking!.country),
                        ]),

                        // Booking Details card
                        _buildCard('Booking Details', [
                          _buildInfoRow(Icons.event_available, 'Booked On',
                              formatBookedOn(_booking!.bookedAt)),
                          _buildInfoRow(Icons.school_outlined, 'Course',
                              _booking!.course),
                          _buildInfoRow(Icons.calendar_today_outlined,
                              'Preferred Date', _booking!.preferredDate),
                          _buildInfoRow(Icons.access_time_outlined,
                              'Preferred Time', _booking!.preferredTime),
                          _buildInfoRow(Icons.location_on_outlined, 'Location',
                              _booking!.location),
                        ]),

                        // Scheduled Details card (only if confirmed)
                        if (_booking!.status == 'confirmed') ...[
                          _buildCard('Scheduled Details', [
                            _buildInfoRow(Icons.event_outlined,
                                'Scheduled Date', formatDemoDate(_booking!.scheduledDate)),
                            _buildInfoRow(Icons.schedule_outlined,
                                'Scheduled Time', formatDemoTime(_booking!.scheduledTime)),
                            _buildInfoRow(Icons.person_outline,
                                'Assigned Teacher', _booking!.assignedTeacher),
                          ]),
                        ],

                        // WhatsApp card: opens the admin's WhatsApp with the message typed in
                        if (whatsAppNumber(_booking!.phone) != null)
                          _buildCard('WhatsApp', [
                            if (_booking!.ackWhatsappAt != null)
                              _buildInfoRow(Icons.check_circle_outline,
                                  'Acknowledgement sent', sentLabel(_booking!.ackWhatsappAt)),
                            if (_booking!.confirmWhatsappAt != null)
                              _buildInfoRow(Icons.check_circle_outline,
                                  'Confirmation sent', sentLabel(_booking!.confirmWhatsappAt)),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                FilledButton.icon(
                                  onPressed: () => _whatsApp('ack'),
                                  style: FilledButton.styleFrom(
                                      backgroundColor: whatsAppGreen),
                                  icon: const Icon(Icons.chat, size: 18),
                                  label: const Text('Received'),
                                ),
                                if (_booking!.status == 'confirmed')
                                  FilledButton.icon(
                                    onPressed: () => _whatsApp('confirm'),
                                    style: FilledButton.styleFrom(
                                        backgroundColor: whatsAppGreen),
                                    icon: const Icon(Icons.event_available, size: 18),
                                    label: const Text('Confirmed'),
                                  ),
                              ],
                            ),
                          ]),

                        // Notes card
                        if (_booking!.notes != null &&
                            _booking!.notes!.isNotEmpty) ...[
                          _buildCard('Notes', [
                            Text(_booking!.notes!,
                                style: AppTextStyles.bodyMedium),
                          ]),
                        ],

                        // Action buttons
                        if (_booking!.status == 'pending') ...[
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton(
                                  onPressed: _confirm,
                                  child: const Text('Confirm'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: _cancel,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.error,
                                    side:
                                        const BorderSide(color: AppColors.error),
                                  ),
                                  child: const Text('Cancel'),
                                ),
                              ),
                            ],
                          ),
                        ] else if (_booking!.status == 'confirmed') ...[
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton(
                                  onPressed: _complete,
                                  style: FilledButton.styleFrom(
                                    backgroundColor: AppColors.success,
                                  ),
                                  child: const Text('Complete'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: _cancel,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.error,
                                    side:
                                        const BorderSide(color: AppColors.error),
                                  ),
                                  child: const Text('Cancel'),
                                ),
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
      ),
    );
  }
}
