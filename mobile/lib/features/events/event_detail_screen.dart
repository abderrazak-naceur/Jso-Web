import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/club_event.dart';
import '../../data/repositories/club_content_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';

/// Event detail from `GET /api/events/{slug}` (keyed by SLUG).
///
/// When opened from the agenda, [initial] (the list item) is shown at once
/// while the detail request refreshes it with the full description; a failed
/// refresh keeps that data on screen with a retry banner. A 404 means the
/// event was unpublished or removed, so a dedicated message replaces it.
class EventDetailScreen extends StatefulWidget {
  const EventDetailScreen({super.key, required this.slug, this.initial});

  final String slug;
  final ClubEvent? initial;

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  late Future<ClubEvent> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<ClubContentRepository>().getEvent(widget.slug);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Événement')),
      body: FutureBuilder<ClubEvent>(
        future: _future,
        builder: (context, snapshot) {
          final loading = snapshot.connectionState == ConnectionState.waiting;
          final error = loading ? null : snapshot.error;
          if (error is NotFoundException) {
            return const EmptyView(
              message: 'Cet événement n\'est plus disponible.',
              icon: Icons.event_busy_outlined,
            );
          }

          final event = snapshot.data ?? widget.initial;
          if (event != null) {
            return _EventDetailBody(
              event: event,
              loading: loading,
              error: error,
              onRetry: () => setState(_load),
            );
          }
          if (error != null) {
            return ErrorView(
              message:
                  'Impossible de charger cet événement.\n'
                  '${describeApiError(error)}',
              onRetry: () => setState(_load),
            );
          }
          return const LoadingView(message: 'Chargement de l\'événement…');
        },
      ),
    );
  }
}

class _EventDetailBody extends StatelessWidget {
  const _EventDetailBody({
    required this.event,
    required this.loading,
    required this.error,
    required this.onRetry,
  });

  final ClubEvent event;

  /// Whether the detail request is still in flight (thin progress bar).
  final bool loading;

  /// A non-404 failure of the detail request, shown as a retry banner.
  final Object? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final location = event.location;
    final description = event.description;
    final error = this.error;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (loading)
          const LinearProgressIndicator(
            minHeight: 2,
            color: JsoColors.gold,
            backgroundColor: JsoColors.navy2,
          ),
        Expanded(
          child: RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => onRetry(),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(JsoSpacing.md),
              children: [
                Text(
                  event.title,
                  style: const TextStyle(
                    color: JsoColors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: JsoSpacing.md),
                _DetailLine(
                  icon: Icons.schedule,
                  text: JsoFormat.dateRange(event.startAt, event.endAt),
                  color: JsoColors.gold,
                ),
                if (location != null)
                  _DetailLine(icon: Icons.place_outlined, text: location),
                if (error != null)
                  _RefreshErrorBanner(
                    message: describeApiError(error),
                    onRetry: onRetry,
                  ),
                const SizedBox(height: JsoSpacing.lg),
                Text(
                  description ?? 'Aucune description pour cet événement.',
                  style: TextStyle(
                    color: description == null
                        ? JsoColors.muted
                        : JsoColors.white,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _DetailLine extends StatelessWidget {
  const _DetailLine({
    required this.icon,
    required this.text,
    this.color = JsoColors.muted,
  });

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: JsoSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: JsoSpacing.sm),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: color, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

/// Inline notice shown when refreshing an already-displayed event failed.
class _RefreshErrorBanner extends StatelessWidget {
  const _RefreshErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: JsoSpacing.sm),
      padding: const EdgeInsets.fromLTRB(
        JsoSpacing.md,
        JsoSpacing.sm,
        JsoSpacing.sm,
        JsoSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: JsoColors.navy2,
        borderRadius: BorderRadius.circular(JsoRadius.control),
        border: Border.all(color: JsoColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.cloud_off_outlined, color: JsoColors.muted),
          const SizedBox(width: JsoSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: JsoColors.muted),
            ),
          ),
          TextButton(onPressed: onRetry, child: const Text('Réessayer')),
        ],
      ),
    );
  }
}
