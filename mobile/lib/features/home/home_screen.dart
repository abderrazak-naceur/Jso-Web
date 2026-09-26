import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/article.dart';
import '../../data/models/home_data.dart';
import '../../data/models/match.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/jso_crest.dart';
import '../../shared/widgets/loading_view.dart';
import '../../shared/widgets/remote_image.dart';
import '../matches/match_detail_screen.dart';
import '../news/news_detail_screen.dart';

/// Home tab: renders the aggregated `GET /api/home` payload.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<HomeData> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final repo = context.read<PublicApiRepository>();
    _future = repo.getHome();
  }

  Future<void> _refresh() async {
    setState(_load);
    // Swallow errors here; the FutureBuilder renders the error state.
    await _future.then<void>((_) {}, onError: (_) {});
  }

  /// The site-copy entries worth rendering: keys/values that carry text.
  static Map<String, String> _visibleContent(Map<String, String> content) {
    return {
      for (final entry in content.entries)
        if (entry.value.trim().isNotEmpty) entry.key: entry.value,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('JSO'), titleSpacing: JsoSpacing.md),
      body: FutureBuilder<HomeData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Loading home…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Could not load the home page.',
              onRetry: () => setState(_load),
            );
          }

          final home = snapshot.data;
          if (home == null) {
            return ErrorView(
              message: 'Could not load the home page.',
              onRetry: () => setState(_load),
            );
          }

          final isEmpty =
              home.nextMatch == null &&
              home.recentMatches.isEmpty &&
              home.news.isEmpty &&
              home.content.isEmpty;
          if (isEmpty) {
            return RefreshIndicator(
              color: JsoColors.gold,
              onRefresh: _refresh,
              child: ListView(
                children: [
                  _ClubHeader(home: home),
                  const SizedBox(height: JsoSpacing.xl),
                  const EmptyView(message: 'No content available yet.'),
                ],
              ),
            );
          }

          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.only(bottom: JsoSpacing.xl),
              children: [
                _ClubHeader(home: home),
                if (home.nextMatch != null) ...[
                  const _SectionTitle('Next match'),
                  _NextMatchCard(match: home.nextMatch!),
                ],
                if (home.recentMatches.isNotEmpty) ...[
                  const _SectionTitle('Recent matches'),
                  ...home.recentMatches.map((m) => _RecentMatchTile(match: m)),
                ],
                if (home.news.isNotEmpty) ...[
                  const _SectionTitle('Latest news'),
                  ...home.news.take(3).map((a) => _NewsPreviewTile(article: a)),
                ],
                if (_visibleContent(home.content).isNotEmpty) ...[
                  const _SectionTitle('About the club'),
                  ..._visibleContent(home.content).entries
                      .map((e) => _ContentTile(label: e.key, body: e.value)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ClubHeader extends StatelessWidget {
  const _ClubHeader({required this.home});

  final HomeData home;

  @override
  Widget build(BuildContext context) {
    final club = home.club;
    final title = club?.name ?? 'Jeunesse Sportive de Oudhref';
    final subtitle = club == null
        ? 'Oudhref · Tunisie'
        : '${club.city} · ${club.country}';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(JsoSpacing.lg),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [JsoColors.navy2, JsoColors.ink],
        ),
      ),
      child: Column(
        children: [
          const JsoCrest(size: 96),
          const SizedBox(height: JsoSpacing.md),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: JsoColors.gold,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: JsoSpacing.xs),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(color: JsoColors.muted),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        JsoSpacing.md,
        JsoSpacing.lg,
        JsoSpacing.md,
        JsoSpacing.sm,
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: JsoColors.white,
          fontSize: 16,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _NextMatchCard extends StatelessWidget {
  const _NextMatchCard({required this.match});

  final Match match;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: JsoSpacing.md),
      child: Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(JsoRadius.card),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => MatchDetailScreen(matchId: match.id),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(JsoSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _Badge(text: JsoFormat.homeAway(match)),
                    const SizedBox(width: JsoSpacing.sm),
                    _Badge(text: match.status),
                  ],
                ),
                const SizedBox(height: JsoSpacing.sm),
                Text(
                  JsoFormat.fixture(match),
                  style: const TextStyle(
                    color: JsoColors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
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
        ),
      ),
    );
  }
}

class _RecentMatchTile extends StatelessWidget {
  const _RecentMatchTile({required this.match});

  final Match match;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: JsoSpacing.md),
      child: Card(
        child: ListTile(
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => MatchDetailScreen(matchId: match.id),
            ),
          ),
          title: Text(
            JsoFormat.fixture(match),
            style: const TextStyle(color: JsoColors.white),
          ),
          subtitle: Text(
            JsoFormat.date(match.kickoffAt),
            style: const TextStyle(color: JsoColors.muted),
          ),
          trailing: Text(
            JsoFormat.scoreOrStatus(match),
            style: const TextStyle(
              color: JsoColors.gold,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}

class _NewsPreviewTile extends StatelessWidget {
  const _NewsPreviewTile({required this.article});

  final Article article;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: JsoSpacing.md),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: ListTile(
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => NewsDetailScreen(slug: article.slug),
            ),
          ),
          leading: SizedBox(
            width: 56,
            height: 56,
            child: RemoteImage(url: article.coverImageUrl),
          ),
          title: Text(
            article.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: JsoColors.white),
          ),
          subtitle: article.publishedAt != null
              ? Text(
                  JsoFormat.date(article.publishedAt!),
                  style: const TextStyle(color: JsoColors.muted),
                )
              : null,
        ),
      ),
    );
  }
}

class _ContentTile extends StatelessWidget {
  const _ContentTile({required this.label, required this.body});

  final String label;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: JsoSpacing.md),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(JsoSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: JsoColors.gold,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: JsoSpacing.xs),
              Text(body, style: const TextStyle(color: JsoColors.muted)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: JsoSpacing.sm,
        vertical: JsoSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: JsoColors.navy2,
        borderRadius: BorderRadius.circular(JsoRadius.pill),
        border: Border.all(color: JsoColors.border),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: JsoColors.muted,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
