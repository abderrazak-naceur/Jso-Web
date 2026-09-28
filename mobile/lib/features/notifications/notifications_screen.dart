import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/article.dart';
import '../../data/models/club_event.dart';
import '../../data/models/home_data.dart';
import '../../data/models/match.dart';
import '../../data/repositories/club_content_repository.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../matches/match_detail_screen.dart';
import '../news/news_detail_screen.dart';

/// In-app notifications centre.
///
/// There is no push backend (FCM is future work), so this screen builds a
/// timeline of club "alerts" from data the API already exposes: the next
/// match (`GET /api/home`), the latest articles, and the next published club
/// event (`GET /api/events`). Each item deep-links to its detail screen. This
/// gives the home bell a real, useful destination without a notifications
/// service.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<List<_Alert>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final home = context.read<PublicApiRepository>().getHome();
    // Events are a bonus: a failure there must not break the notifications
    // list, so recover to an empty list.
    final events = context.read<ClubContentRepository>().getEvents().catchError(
      (_) => <ClubEvent>[],
    );
    _future = Future.wait([home, events])
        .then((r) => _buildAlerts(r[0] as HomeData, r[1] as List<ClubEvent>));
  }

  Future<void> _refresh() async {
    setState(_load);
    await _future.then<void>((_) {}, onError: (_) {});
  }

  /// Builds the alert timeline, most relevant first: the upcoming match, then
  /// the next club event, then the latest news (max 4).
  static List<_Alert> _buildAlerts(HomeData home, List<ClubEvent> events) {
    final now = DateTime.now();
    final alerts = <_Alert>[];

    final next = home.nextMatch;
    if (next != null) {
      alerts.add(
        _Alert(
          kind: _AlertKind.match,
          title: JsoFormat.fixture(next),
          subtitle: _matchSubtitle(next, now),
          when: next.kickoffAt,
          matchId: next.id,
        ),
      );
    }

    final upcomingEvent =
        (events.where((e) => (e.endAt ?? e.startAt).isAfter(now)).toList()
              ..sort((a, b) => a.startAt.compareTo(b.startAt)))
            .firstOrNull;
    if (upcomingEvent != null) {
      alerts.add(
        _Alert(
          kind: _AlertKind.event,
          title: upcomingEvent.title,
          subtitle: JsoFormat.dateRange(
            upcomingEvent.startAt,
            upcomingEvent.endAt,
          ),
          when: upcomingEvent.startAt,
        ),
      );
    }

    for (final article in home.news.take(4)) {
      alerts.add(
        _Alert(
          kind: _AlertKind.news,
          title: article.title,
          subtitle: article.publishedAt != null
              ? JsoFormat.date(article.publishedAt!)
              : 'Actualité',
          when: article.publishedAt,
          article: article,
        ),
      );
    }

    return alerts;
  }

  static String _matchSubtitle(Match match, DateTime now) {
    final kickoff = match.kickoffAt;
    if (kickoff.isAfter(now)) {
      final days = kickoff.difference(now).inDays;
      final prefix = days >= 1
          ? 'Dans $days ${days == 1 ? 'jour' : 'jours'} · '
          : "Aujourd'hui · ";
      return '$prefix${JsoFormat.dateTime(kickoff)}';
    }
    return JsoFormat.dateTime(kickoff);
  }

  void _open(_Alert alert) {
    if (alert.matchId != null) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => MatchDetailScreen(matchId: alert.matchId!),
        ),
      );
    } else if (alert.article != null) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => NewsDetailScreen(slug: alert.article!.slug),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: SafeArea(
        child: FutureBuilder<List<_Alert>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const LoadingView(
                message: 'Chargement des notifications…',
              );
            }
            if (snapshot.hasError) {
              return ErrorView(
                message: describeApiError(snapshot.error!),
                onRetry: () => setState(_load),
              );
            }
            final alerts = snapshot.data ?? const <_Alert>[];
            if (alerts.isEmpty) {
              return const EmptyView(
                message: 'Aucune notification pour le moment.',
                icon: Icons.notifications_off_outlined,
              );
            }
            return RefreshIndicator(
              color: JsoColors.gold,
              onRefresh: _refresh,
              child: ListView.separated(
                padding: const EdgeInsets.all(JsoSpacing.md),
                itemCount: alerts.length,
                separatorBuilder: (_, _) =>
                    const SizedBox(height: JsoSpacing.sm),
                itemBuilder: (_, i) =>
                    _AlertTile(alert: alerts[i], onTap: () => _open(alerts[i])),
              ),
            );
          },
        ),
      ),
    );
  }
}

enum _AlertKind { match, event, news }

class _Alert {
  const _Alert({
    required this.kind,
    required this.title,
    required this.subtitle,
    this.when,
    this.matchId,
    this.article,
  });

  final _AlertKind kind;
  final String title;
  final String subtitle;
  final DateTime? when;
  final String? matchId;
  final Article? article;

  bool get tappable => matchId != null || article != null;
}

class _AlertTile extends StatelessWidget {
  const _AlertTile({required this.alert, required this.onTap});

  final _Alert alert;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, String label) = switch (alert.kind) {
      _AlertKind.match => (Icons.sports_soccer, 'Match'),
      _AlertKind.event => (Icons.event, 'Événement'),
      _AlertKind.news => (Icons.article_outlined, 'Actualité'),
    };
    return Card(
      child: ListTile(
        onTap: alert.tappable ? onTap : null,
        leading: CircleAvatar(
          backgroundColor: JsoColors.navy2,
          child: Icon(icon, color: JsoColors.gold, size: 20),
        ),
        title: Text(
          alert.title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Text('$label · ${alert.subtitle}'),
        ),
        trailing: alert.tappable
            ? const Icon(Icons.chevron_right, color: JsoColors.muted2)
            : null,
      ),
    );
  }
}
