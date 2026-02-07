import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../bloc/demo_booking/demo_booking_bloc.dart';
import '../../../bloc/demo_booking/demo_booking_event.dart';
import '../../../bloc/demo_booking/demo_booking_state.dart';
import '../../../widgets/empty_state_widget.dart';

class DemoListScreen extends StatelessWidget {
  const DemoListScreen({super.key});

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Demo Bookings')),
      body: BlocConsumer<DemoBookingBloc, DemoBookingState>(
        listener: (context, state) {
          if (state is DemoBookingOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is DemoBookingError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is DemoBookingLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is DemoBookingsLoaded) {
            if (state.demoBookings.isEmpty) {
              return EmptyStateWidget(
                icon: Icons.calendar_today_outlined,
                title: 'No demo bookings',
                subtitle: 'Demo class requests will appear here.',
              );
            }
            return RefreshIndicator(
              onRefresh: () async =>
                  context.read<DemoBookingBloc>().add(LoadDemoBookings()),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.demoBookings.length,
                itemBuilder: (context, index) {
                  final booking = state.demoBookings[index];
                  final color = _statusColor(booking.status);
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: color,
                        child: const Icon(Icons.calendar_today,
                            color: Colors.white),
                      ),
                      title: Text(
                        booking.studentName ?? 'Unknown Student',
                        style: AppTextStyles.labelLarge,
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (booking.course != null &&
                              booking.course!.isNotEmpty)
                            Text(booking.course!,
                                style: AppTextStyles.caption),
                          if (booking.preferredDate != null ||
                              booking.preferredTime != null)
                            Text(
                              'Preferred: ${booking.preferredDate ?? ''} ${booking.preferredTime ?? ''}'
                                  .trim(),
                              style: AppTextStyles.caption,
                            ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              (booking.status ?? 'unknown').toUpperCase(),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: color,
                              ),
                            ),
                          ),
                          if (booking.parentName != null &&
                              booking.parentName!.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              [
                                booking.parentName!,
                                if (booking.phone != null &&
                                    booking.phone!.isNotEmpty)
                                  booking.phone!,
                              ].join(' | '),
                              style: AppTextStyles.caption,
                            ),
                          ],
                        ],
                      ),
                      onTap: () =>
                          context.push('/admin/demos/${booking.id}'),
                    ),
                  );
                },
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}
