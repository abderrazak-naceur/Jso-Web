import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/live_blog_entry.dart';
import '../../data/models/match.dart';
import '../../data/models/match_event.dart';
import '../../data/models/match_reminder.dart';
import '../../data/repositories/match_center_repository.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../tickets/tickets_screen.dart';
import 'match_lineup_tab.dart';
import 'match_stats_tab.dart';
import 'match_weather_card.dart';

/// Bundles the two calls needed to render match detail.
class _MatchDetailData {
  const _MatchDetailData({required this.match, required this.events});

  final Match match;
  final List<MatchEvent> events;
}

/// Match detail and match-center tabs for a public fixture.
class MatchDetailScreen extends StatefulWidget {
  const MatchDetailScreen({super.key, required this.matchId});

  final String matchId;

  @override
  State<MatchDetailScreen> createState() => _MatchDetailScreenState();
}

class _MatchDetailScreenState extends State<MatchDetailScreen> {
  late Future<_MatchDetailData> _future;
  late Future<MatchWeather?> _weatherFuture;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final publicRepository = context.read<PublicApiRepository>();
    final matchCenterRepository = context.read<MatchCenterRepository>();
    _weatherFuture = Future<MatchWeather?>.value();
    _future =
        Future.wait([
          publicRepository.getMatch(widget.matchId),
          publicRepository.getMatchEvents(widget.matchId),
        ]).then((results) {
          final data = _MatchDetailData(
            match: results[0] as Match,
            events: results[1] as List<MatchEvent>,
          );
          _weatherFuture = _loadWeather(
            matchCenterRepository,
            data.match,
            widget.matchId,
          );
          return data;
        });
  }

  Future<MatchWeather?> _loadWeather(
    MatchCenterRepository repository,
    Match match,
    String matchId,
  ) async {
    if (!_canRequestWeather(match)) return null;
    try {
      final reminder = await repository.getReminder(matchId);
      return reminder.weather;
    } catch (_) {
      // Weather is optional and must never hide the core match detail.
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Match'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Résumé'),
              Tab(text: 'Direct'),
              Tab(text: 'Compos'),
              Tab(text: 'Stats'),
            ],
          ),
        ),
        body: FutureBuilder<_MatchDetailData>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const LoadingView(message: 'Chargement du match…');
            }
            if (snapshot.hasError) {
              return ErrorView(
                message: 'Impossible de charger ce match.',
                onRetry: () => setState(_load),
              );
            }

            final data = snapshot.data;
            if (data == null) {
              return ErrorView(
                message: 'Impossible de charger ce match.',
                onRetry: () => setState(_load),
              );
            }

            return TabBarView(
              children: [
                _MatchSummaryTab(data: data, weatherFuture: _weatherFuture),
                _LiveBlogTab(matchId: widget.matchId),
                MatchLineupTab(matchId: widget.matchId),
                MatchStatsTab(matchId: widget.matchId, match: data.match),
              ],
            );
          },
        ),
      ),
    );
  }
}

bool _canRequestWeather(Match match) {
  final status = match.status.trim().toLowerCase();
  return !match.hasResult && status != 'finished' && status != 'cancelled';
}

bool _canShowWeather(Match match) =>
    _canRequestWeather(match) && match.kickoffAt.isAfter(DateTime.now());

class _MatchSummaryTab extends StatelessWidget {
  const _MatchSummaryTab({required this.data, required this.weatherFuture});

  final _MatchDetailData data;
  final Future<MatchWeather?> weatherFuture;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(JsoSpacing.md),
      children: [
        _MatchHeader(match: data.match),
        const SizedBox(height: JsoSpacing.md),
        _WeatherSection(match: data.match, future: weatherFuture),
        _TicketsCta(match: data.match),
        const SizedBox(height: JsoSpacing.lg),
        const Text(
          'Chronologie',
          style: TextStyle(
            color: JsoColors.white,
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: JsoSpacing.sm),
        if (data.events.isEmpty)
          const EmptyView(
            message: 'Aucun événement enregistré pour ce match.',
            icon: Icons.timeline_outlined,
          )
        else
          ...(data.events.toList()
                ..sort((a, b) => a.minute.compareTo(b.minute)))
              .map((event) => _EventTile(event: event)),
      ],
    );
  }
}

class _WeatherSection extends StatelessWidget {
  const _WeatherSection({required this.match, required this.future});

  final Match match;
  final Future<MatchWeather?> future;

  @override
  Widget build(BuildContext context) {
    if (!_canShowWeather(match)) return const SizedBox.shrink();

    return FutureBuilder<MatchWeather?>(
      future: future,
      builder: (context, snapshot) {
        final weather = snapshot.data;
        if (snapshot.hasError || weather == null) {
          return const SizedBox.shrink();
        }
        return Padding(
          padding: const EdgeInsets.only(bottom: JsoSpacing.md),
          child: MatchWeatherCard(weather: weather),
        );
      },
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
              '${JsoFormat.matchStatus(match.status)} · '
              '${JsoFormat.homeAway(match)}',
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

/// Entry point to the match billetterie from the summary tab.
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
          _eventTypeLabel(event.type),
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

String _eventTypeLabel(String type) {
  return switch (type) {
    'Goal' => 'But',
    'YellowCard' => 'Carton jaune',
    'RedCard' => 'Carton rouge',
    'Substitution' => 'Remplacement',
    'Kickoff' => 'Coup d’envoi',
    'HalfTime' => 'Mi-temps',
    'FullTime' => 'Fin du match',
    _ => type,
  };
}

/// Direct tab: polls `GET /api/matches/{id}/liveblog` every 25 seconds.
///
/// The timer is cancelled in [dispose], [_isFetching] prevents overlapping
/// calls, and transient poll failures keep the last successful feed visible.
class _LiveBlogTab extends StatefulWidget {
  const _LiveBlogTab({required this.matchId});

  final String matchId;

  @override
  State<_LiveBlogTab> createState() => _LiveBlogTabState();
}

class _LiveBlogTabState extends State<_LiveBlogTab> {
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
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error;
      });
    } finally {
      _isFetching = false;
    }
  }

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
      // Ignore transient poll failures; manual refresh surfaces errors.
    } finally {
      _isFetching = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const LoadingView(message: 'Chargement du direct…');
    }
    if (_error != null) {
      return ErrorView(
        message: 'Impossible de charger le direct.',
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
                  'Direct',
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
              message: 'Pas encore de mise à jour en direct.',
              icon: Icons.podcasts_outlined,
            )
          else
            ..._entries.map((entry) => _LiveBlogTile(entry: entry)),
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

class _KindStyle {
  const _KindStyle(this.icon, this.label);

  final IconData icon;
  final String label;

  static _KindStyle of(String kind) {
    return switch (kind) {
      'Goal' => const _KindStyle(Icons.sports_soccer, 'But'),
      'Card' => const _KindStyle(Icons.style, 'Carton'),
      'Substitution' => const _KindStyle(Icons.swap_horiz, 'Remplacement'),
      'Text' => const _KindStyle(Icons.chat_bubble_outline, 'Info'),
      _ => const _KindStyle(Icons.chat_bubble_outline, 'Info'),
    };
  }
}
