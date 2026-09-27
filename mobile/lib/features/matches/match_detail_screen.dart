import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/live_blog_entry.dart';
import '../../data/models/match.dart';
import '../../data/models/match_event.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../tickets/tickets_screen.dart';

/// Bundles the two calls needed to render match detail.
class _MatchDetailData {
  const _MatchDetailData({required this.match, required this.events});

  final Match match;
  final List<MatchEvent> events;
}

/// Match detail: score/status/venue from `GET /api/matches/{id}` and the
/// timeline from `GET /api/matches/{id}/events`. A second "Live" tab renders
/// the polling live blog from `GET /api/matches/{id}/liveblog`. IDs are GUID
/// strings.
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
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Match'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Timeline'),
              Tab(text: 'Live'),
            ],
          ),
        ),
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

            return TabBarView(
              children: [
                _TimelineTab(data: data),
                _LiveBlogTab(matchId: widget.matchId, match: data.match),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _TimelineTab extends StatelessWidget {
  const _TimelineTab({required this.data});

  final _MatchDetailData data;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(JsoSpacing.md),
      children: [
        _MatchHeader(match: data.match),
        const SizedBox(height: JsoSpacing.md),
        _TicketsCta(match: data.match),
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

/// Entry point to the match billetterie from the timeline tab.
class _TicketsCta extends StatelessWidget {
  const _TicketsCta({required this.match});

  final Match match;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => TicketsScreen(match: match)),
        ),
        icon: const Icon(Icons.confirmation_number_outlined),
        label: const Text('Billetterie'),
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

/// Live blog tab: renders the feed from `GET /api/matches/{id}/liveblog` and
/// refreshes it with a lightweight [Timer] while the view is mounted.
///
/// The timer starts in [initState] and is cancelled in [dispose] so there is
/// no leak. A guard flag prevents overlapping polls, and a pull-to-refresh
/// plus an "Actualiser" button allow manual reloads. The initial load drives
/// LOADING/EMPTY/ERROR states; subsequent polls update the list silently and
/// keep the last good data on transient failures.
class _LiveBlogTab extends StatefulWidget {
  const _LiveBlogTab({required this.matchId, required this.match});

  final String matchId;
  final Match match;

  @override
  State<_LiveBlogTab> createState() => _LiveBlogTabState();
}

class _LiveBlogTabState extends State<_LiveBlogTab> {
  /// Polling cadence for the live feed. Kept intentionally light.
  static const Duration _pollInterval = Duration(seconds: 25);

  Timer? _timer;
  bool _isFetching = false;

  bool _loading = true;
  Object? _error;
  List<LiveBlogEntry> _entries = const [];

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(_pollInterval, (_) => _poll());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _timer = null;
    super.dispose();
  }

  /// Initial/manual load: drives the LOADING and ERROR states.
  Future<void> _refresh() async {
    if (_isFetching) return;
    _isFetching = true;
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final entries = await context
          .read<PublicApiRepository>()
          .getMatchLiveBlog(widget.matchId);
      if (!mounted) return;
      setState(() {
        _entries = entries;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e;
      });
    } finally {
      _isFetching = false;
    }
  }

  /// Background poll: updates the list silently and keeps the last good data
  /// (and any existing error) on a transient failure. Skips when a fetch is
  /// already in flight to avoid overlapping calls.
  Future<void> _poll() async {
    if (_isFetching) return;
    _isFetching = true;
    try {
      final entries = await context
          .read<PublicApiRepository>()
          .getMatchLiveBlog(widget.matchId);
      if (!mounted) return;
      setState(() {
        _entries = entries;
        _error = null;
      });
    } catch (_) {
      // Ignore transient poll failures; the manual refresh surfaces errors.
    } finally {
      _isFetching = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const LoadingView(message: 'Loading live blog…');
    }
    if (_error != null) {
      return ErrorView(
        message: 'Could not load the live blog.',
        onRetry: _refresh,
      );
    }

    return RefreshIndicator(
      color: JsoColors.gold,
      onRefresh: _refresh,
      child: ListView(
        padding: const EdgeInsets.all(JsoSpacing.md),
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Live',
                  style: TextStyle(
                    color: JsoColors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              TextButton.icon(
                onPressed: _refresh,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Actualiser'),
              ),
            ],
          ),
          const SizedBox(height: JsoSpacing.sm),
          if (_entries.isEmpty)
            const EmptyView(
              message: 'No live updates yet.',
              icon: Icons.podcasts_outlined,
            )
          else
            ..._entries.map((e) => _LiveBlogTile(entry: e)),
        ],
      ),
    );
  }
}

class _LiveBlogTile extends StatelessWidget {
  const _LiveBlogTile({required this.entry});

  final LiveBlogEntry entry;

  @override
  Widget build(BuildContext context) {
    final kind = _KindStyle.of(entry.kind);
    return Card(
      color: entry.isPinned ? JsoColors.navy3 : null,
      shape: entry.isPinned
          ? RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: JsoColors.gold),
            )
          : null,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: JsoColors.navy2,
          child: Icon(kind.icon, color: JsoColors.gold, size: 20),
        ),
        title: Row(
          children: [
            if (entry.isPinned) ...[
              const Icon(Icons.push_pin, color: JsoColors.gold, size: 14),
              const SizedBox(width: JsoSpacing.xs),
            ],
            _Badge(label: kind.label),
            if (entry.minute != null) ...[
              const SizedBox(width: JsoSpacing.xs),
              Text(
                "${entry.minute}'",
                style: const TextStyle(
                  color: JsoColors.gold,
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                ),
              ),
            ],
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: JsoSpacing.xs),
          child: Text(
            entry.body,
            style: const TextStyle(color: JsoColors.white),
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: JsoColors.navy2,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: JsoColors.muted,
          fontWeight: FontWeight.w700,
          fontSize: 11,
        ),
      ),
    );
  }
}

/// Maps a live blog `kind` to an icon and label; unknown kinds fall back to a
/// neutral text style so the feed keeps rendering.
class _KindStyle {
  const _KindStyle(this.icon, this.label);

  final IconData icon;
  final String label;

  static _KindStyle of(String kind) {
    switch (kind) {
      case 'Goal':
        return const _KindStyle(Icons.sports_soccer, 'Goal');
      case 'Card':
        return const _KindStyle(Icons.style, 'Card');
      case 'Substitution':
        return const _KindStyle(Icons.swap_horiz, 'Substitution');
      case 'Text':
        return const _KindStyle(Icons.chat_bubble_outline, 'Update');
      default:
        return _KindStyle(
          Icons.chat_bubble_outline,
          kind.isEmpty ? 'Update' : kind,
        );
    }
  }
}
