import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/match.dart';
import '../../data/models/match_event.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';

/// Bundles the two calls needed to render match detail.
class _MatchDetailData {
  const _MatchDetailData({required this.match, required this.events});

  final Match match;
  final List<MatchEvent> events;
}

/// Match detail: score/status/venue from `GET /api/matches/{id}` and the
/// timeline from `GET /api/matches/{id}/events`. IDs are GUID strings.
class MatchDetailScreen extends StatefulWidget {
  const MatchDetailScreen({super.key, required this.matchId});

  final String matchId;

  @override
  State<MatchDetailScreen> createState() => _MatchDetailScreenState();
}

class _MatchDetailScreenState extends State<MatchDetailScreen> {
  late Future<_MatchDetailData> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final repo = context.read<PublicApiRepository>();
    _future =
        Future.wait([
          repo.getMatch(widget.matchId),
          repo.getMatchEvents(widget.matchId),
        ]).then(
          (results) => _MatchDetailData(
            match: results[0] as Match,
            events: results[1] as List<MatchEvent>,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Match')),
      body: FutureBuilder<_MatchDetailData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Loading match…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Could not load this match.',
              onRetry: () => setState(_load),
            );
          }

          final data = snapshot.data;
          if (data == null) {
            return ErrorView(
              message: 'Could not load this match.',
              onRetry: () => setState(_load),
            );
          }

          return ListView(
            padding: const EdgeInsets.all(JsoSpacing.md),
            children: [
              _MatchHeader(match: data.match),
              const SizedBox(height: JsoSpacing.lg),
              const Text(
                'Timeline',
                style: TextStyle(
                  color: JsoColors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: JsoSpacing.sm),
              if (data.events.isEmpty)
                const EmptyView(
                  message: 'No events recorded for this match.',
                  icon: Icons.timeline_outlined,
                )
              else
                ...(data.events.toList()
                      ..sort((a, b) => a.minute.compareTo(b.minute)))
                    .map((e) => _EventTile(event: e)),
            ],
          );
        },
      ),
    );
  }
}

class _MatchHeader extends StatelessWidget {
  const _MatchHeader({required this.match});

  final Match match;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.lg),
        child: Column(
          children: [
            Text(
              JsoFormat.fixture(match),
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: JsoColors.white,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: JsoSpacing.sm),
            Text(
              JsoFormat.scoreOrStatus(match),
              style: const TextStyle(
                color: JsoColors.gold,
                fontSize: 32,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: JsoSpacing.sm),
            Text(
              '${match.status} · ${JsoFormat.homeAway(match)}',
              style: const TextStyle(color: JsoColors.muted),
            ),
            const SizedBox(height: JsoSpacing.xs),
            Text(
              JsoFormat.dateTime(match.kickoffAt),
              style: const TextStyle(color: JsoColors.muted),
            ),
            if (match.venue != null && match.venue!.isNotEmpty) ...[
              const SizedBox(height: JsoSpacing.xs),
              Text(
                match.venue!,
                style: const TextStyle(color: JsoColors.muted2),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EventTile extends StatelessWidget {
  const _EventTile({required this.event});

  final MatchEvent event;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: JsoColors.navy2,
          child: Text(
            "${event.minute}'",
            style: const TextStyle(
              color: JsoColors.gold,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
        ),
        title: Text(
          event.type,
          style: const TextStyle(
            color: JsoColors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: (event.playerName != null && event.playerName!.isNotEmpty)
            ? Text(
                event.playerName!,
                style: const TextStyle(color: JsoColors.muted),
              )
            : (event.notes != null && event.notes!.isNotEmpty)
            ? Text(event.notes!, style: const TextStyle(color: JsoColors.muted))
            : null,
      ),
    );
  }
}
