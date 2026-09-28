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
import '../auth/profile_screen.dart';
import '../matches/match_detail_screen.dart';
import '../news/news_detail_screen.dart';

/// Home tab: renders the aggregated `GET /api/home` payload.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.onViewAllNews});

  /// Lets the owning shell select its Actualités tab without coupling this
  /// screen to the shell navigation implementation.
  final VoidCallback? onViewAllNews;

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

  void _openProfile() {
    Navigator.of(context)
        .push(MaterialPageRoute<void>(builder: (_) => const ProfileScreen()));
  }

  /// Content values worth rendering. API keys are implementation details and
  /// must never become visible labels in the app.
  static List<String> _visibleContent(Map<String, String> content) {
    return [
      for (final value in content.values)
        if (value.trim().isNotEmpty) value.trim(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: JsoTheme.paper(),
      child: Scaffold(
        body: FutureBuilder<HomeData>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return _HomeStatusLayout(
                onAccountPressed: _openProfile,
                child: const LoadingView(message: 'Chargement de l’accueil…'),
              );
            }
            if (snapshot.hasError) {
              return _HomeStatusLayout(
                onAccountPressed: _openProfile,
                child: ErrorView(
                  message: 'Impossible de charger l’accueil.',
                  onRetry: () => setState(_load),
                ),
              );
            }

            final home = snapshot.data;
            if (home == null) {
              return _HomeStatusLayout(
                onAccountPressed: _openProfile,
                child: ErrorView(
                  message: 'Impossible de charger l’accueil.',
                  onRetry: () => setState(_load),
                ),
              );
            }

            final visibleContent = _visibleContent(home.content);
            final isEmpty =
                home.nextMatch == null &&
                home.recentMatches.isEmpty &&
                home.news.isEmpty &&
                visibleContent.isEmpty;

            return RefreshIndicator(
              color: JsoColors.navy,
              onRefresh: _refresh,
              child: ListView(
                key: const PageStorageKey<String>('home-scroll-view'),
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                padding: const EdgeInsets.only(bottom: JsoSpacing.xl),
                children: [
                  _HomeHeader(
                    hasNextMatch: home.nextMatch != null,
                    onAccountPressed: _openProfile,
                  ),
                  _ContentBounds(
                    child: isEmpty
                        ? const SizedBox(
                            height: 260,
                            child: EmptyView(
                              message:
                                  'Aucun contenu disponible pour le moment.',
                            ),
                          )
                        : _HomeContent(
                            home: home,
                            contentValues: visibleContent,
                            onViewAllNews: widget.onViewAllNews,
                          ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _HomeStatusLayout extends StatelessWidget {
  const _HomeStatusLayout({
    required this.onAccountPressed,
    required this.child,
  });

  final VoidCallback onAccountPressed;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _HomeHeader(onAccountPressed: onAccountPressed),
        Expanded(child: _ContentBounds(child: child)),
      ],
    );
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({
    required this.onAccountPressed,
    this.hasNextMatch = false,
  });

  final VoidCallback onAccountPressed;
  final bool hasNextMatch;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [JsoColors.navy3, JsoColors.navy, JsoColors.ink],
          stops: [0, 0.58, 1],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: _ContentBounds(
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              JsoSpacing.md,
              JsoSpacing.sm,
              JsoSpacing.md,
              hasNextMatch ? 54 : JsoSpacing.lg,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Semantics(
                      image: true,
                      label: 'Blason de la JSO',
                      child: const ExcludeSemantics(child: JsoCrest(size: 62)),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Bonjour,',
                            style: TextStyle(
                              color: JsoColors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: const Text(
                              'supporters',
                              maxLines: 1,
                              style: TextStyle(
                                color: JsoColors.gold2,
                                fontSize: 31,
                                height: 1,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -0.8,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: JsoSpacing.sm),
                    _HeaderIconButton(
                      icon: Icons.notifications_none_rounded,
                      tooltip: 'Notifications bientôt disponibles',
                    ),
                    const SizedBox(width: JsoSpacing.xs),
                    _HeaderIconButton(
                      icon: Icons.person_outline_rounded,
                      tooltip: 'Mon compte',
                      onPressed: onAccountPressed,
                    ),
                  ],
                ),
                const SizedBox(height: JsoSpacing.md),
                const Text(
                  'Plus qu’un club, une famille 💛',
                  style: TextStyle(
                    color: JsoColors.white,
                    fontSize: 15,
                    height: 1.35,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    required this.icon,
    required this.tooltip,
    this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0x14FFFFFF),
      shape: const CircleBorder(side: BorderSide(color: JsoColors.borderHover)),
      child: IconButton(
        constraints: const BoxConstraints.tightFor(width: 42, height: 42),
        padding: EdgeInsets.zero,
        tooltip: tooltip,
        onPressed: onPressed,
        color: JsoColors.white,
        disabledColor: JsoColors.muted,
        icon: Icon(icon, size: 22),
      ),
    );
  }
}

class _ContentBounds extends StatelessWidget {
  const _ContentBounds({required this.child});

  static const double maxWidth = 620;

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: maxWidth),
        child: SizedBox(width: double.infinity, child: child),
      ),
    );
  }
}

class _HomeContent extends StatelessWidget {
  const _HomeContent({
    required this.home,
    required this.contentValues,
    this.onViewAllNews,
  });

  final HomeData home;
  final List<String> contentValues;
  final VoidCallback? onViewAllNews;

  @override
  Widget build(BuildContext context) {
    final hasNextMatch = home.nextMatch != null;

    return Transform.translate(
      offset: Offset(0, hasNextMatch ? -32 : 0),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: JsoSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!hasNextMatch) const SizedBox(height: JsoSpacing.sm),
            if (hasNextMatch) _NextMatchCard(match: home.nextMatch!),
            if (home.news.isNotEmpty) ...[
              _SectionHeader(
                title: 'Actualités',
                actionLabel: onViewAllNews == null ? null : 'Voir tout',
                onAction: onViewAllNews,
              ),
              ...home.news
                  .take(3)
                  .map((article) => _NewsPreviewCard(article: article)),
            ],
            if (home.recentMatches.isNotEmpty) ...[
              const _SectionHeader(title: 'Derniers résultats'),
              ...home.recentMatches.map(
                (match) => _RecentMatchCard(match: match),
              ),
            ],
            if (contentValues.isNotEmpty) ...[
              const _SectionHeader(title: 'À propos du club'),
              _AboutCard(values: contentValues.take(2).toList()),
            ],
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.actionLabel, this.onAction});

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 28, bottom: JsoSpacing.sm),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: JsoColors.inkText,
                fontSize: 22,
                height: 1.1,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.4,
              ),
            ),
          ),
          if (actionLabel != null && onAction != null)
            TextButton.icon(
              onPressed: onAction,
              iconAlignment: IconAlignment.end,
              icon: const Icon(Icons.arrow_forward_rounded, size: 18),
              label: Text(actionLabel!),
              style: TextButton.styleFrom(
                minimumSize: const Size(0, 44),
                padding: const EdgeInsets.symmetric(horizontal: JsoSpacing.sm),
                textStyle: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
        ],
      ),
    );
  }
}

class _NextMatchCard extends StatelessWidget {
  const _NextMatchCard({required this.match});

  final Match match;

  void _openMatch(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MatchDetailScreen(matchId: match.id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final venue = match.venue?.trim();

    return Semantics(
      button: true,
      label:
          'Ouvrir le détail du prochain match : JSO contre ${match.opponentName}',
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(JsoRadius.largeCard),
          boxShadow: const [
            BoxShadow(
              color: JsoColors.shadow,
              blurRadius: 24,
              offset: Offset(0, 12),
            ),
          ],
        ),
        child: Material(
          color: JsoColors.gold2,
          borderRadius: BorderRadius.circular(JsoRadius.largeCard),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => _openMatch(context),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final compact = constraints.maxWidth < 300;
                final markSize = compact ? 44.0 : 54.0;

                return Padding(
                  padding: EdgeInsets.all(compact ? 16 : 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Prochain match',
                              style: TextStyle(
                                color: JsoColors.ink,
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          const SizedBox(width: JsoSpacing.sm),
                          const _MatchKindBadge(),
                        ],
                      ),
                      SizedBox(height: compact ? 14 : 18),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: _TeamIdentity(
                              name: 'JSO',
                              markSize: markSize,
                              isJso: true,
                            ),
                          ),
                          Padding(
                            padding: EdgeInsets.only(top: markSize * 0.32),
                            child: const Text(
                              'VS',
                              style: TextStyle(
                                color: JsoColors.navy,
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          Expanded(
                            child: _TeamIdentity(
                              name: match.opponentName,
                              markSize: markSize,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: JsoSpacing.md),
                      const Divider(color: Color(0x33071225), height: 1),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: JsoSpacing.md,
                        runSpacing: JsoSpacing.sm,
                        children: [
                          _MatchInfo(
                            icon: Icons.calendar_today_outlined,
                            text: JsoFormat.date(match.kickoffAt),
                          ),
                          _MatchInfo(
                            icon: Icons.schedule_rounded,
                            text: JsoFormat.time(match.kickoffAt),
                          ),
                        ],
                      ),
                      if (venue != null && venue.isNotEmpty) ...[
                        const SizedBox(height: JsoSpacing.sm),
                        _MatchInfo(
                          icon: Icons.location_on_outlined,
                          text: venue,
                          expand: true,
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _MatchKindBadge extends StatelessWidget {
  const _MatchKindBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: JsoColors.navy,
        borderRadius: BorderRadius.circular(JsoRadius.pill),
      ),
      child: const Text(
        'Match officiel',
        style: TextStyle(
          color: JsoColors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _TeamIdentity extends StatelessWidget {
  const _TeamIdentity({
    required this.name,
    required this.markSize,
    this.isJso = false,
  });

  final String name;
  final double markSize;
  final bool isJso;

  @override
  Widget build(BuildContext context) {
    final semanticLabel = isJso
        ? 'Blason de la JSO'
        : 'Symbole neutre de l’équipe $name';

    return Column(
      children: [
        Semantics(
          image: true,
          label: semanticLabel,
          child: ExcludeSemantics(
            child: isJso
                ? JsoCrest(size: markSize)
                : Container(
                    width: markSize,
                    height: markSize,
                    decoration: BoxDecoration(
                      color: JsoColors.surface,
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0x33071225)),
                    ),
                    child: Icon(
                      Icons.shield_outlined,
                      color: JsoColors.navy,
                      size: markSize * 0.58,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: JsoSpacing.sm),
        Text(
          name,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: JsoColors.ink,
            fontSize: 13,
            height: 1.15,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _MatchInfo extends StatelessWidget {
  const _MatchInfo({
    required this.icon,
    required this.text,
    this.expand = false,
  });

  final IconData icon;
  final String text;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(
      color: JsoColors.inkText,
      fontSize: 12,
      fontWeight: FontWeight.w700,
    );
    final label = Text(text, overflow: TextOverflow.ellipsis, style: style);

    return Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: JsoColors.navy),
        const SizedBox(width: 6),
        if (expand) Expanded(child: label) else label,
      ],
    );
  }
}

class _NewsPreviewCard extends StatelessWidget {
  const _NewsPreviewCard({required this.article});

  final Article article;

  void _openArticle(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NewsDetailScreen(slug: article.slug),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Lire l’actualité : ${article.title}',
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: JsoColors.surface,
          borderRadius: BorderRadius.circular(JsoRadius.card),
          border: Border.all(color: JsoColors.borderLight),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0D071A3A),
              blurRadius: 14,
              offset: Offset(0, 5),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(JsoRadius.card),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => _openArticle(context),
            child: Row(
              children: [
                Semantics(
                  image: true,
                  label: 'Image de l’actualité ${article.title}',
                  child: ExcludeSemantics(
                    child: SizedBox(
                      width: 88,
                      height: 92,
                      child: RemoteImage(
                        url: article.coverImageUrl,
                        fit: BoxFit.cover,
                        placeholderIcon: Icons.article_outlined,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          article.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: JsoColors.inkText,
                            fontSize: 15,
                            height: 1.2,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          article.publishedAt == null
                              ? article.excerpt
                              : JsoFormat.date(article.publishedAt!),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: JsoColors.inkMuted,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 10),
                  child: ExcludeSemantics(
                    child: Icon(
                      Icons.chevron_right_rounded,
                      color: JsoColors.inkMuted,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RecentMatchCard extends StatelessWidget {
  const _RecentMatchCard({required this.match});

  final Match match;

  void _openMatch(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MatchDetailScreen(matchId: match.id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Ouvrir le match ${JsoFormat.fixture(match)}',
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: JsoColors.surface,
          borderRadius: BorderRadius.circular(JsoRadius.card),
          border: Border.all(color: JsoColors.borderLight),
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(JsoRadius.card),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => _openMatch(context),
            child: Padding(
              padding: const EdgeInsets.all(JsoSpacing.md),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: const BoxDecoration(
                      color: JsoColors.surfaceMuted,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.sports_soccer_rounded,
                      color: JsoColors.navy,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          JsoFormat.fixture(match),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: JsoColors.inkText,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: JsoSpacing.xs),
                        Text(
                          JsoFormat.date(match.kickoffAt),
                          style: const TextStyle(
                            color: JsoColors.inkMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: JsoSpacing.sm),
                  Text(
                    JsoFormat.scoreOrStatus(match),
                    style: const TextStyle(
                      color: JsoColors.navy,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AboutCard extends StatelessWidget {
  const _AboutCard({required this.values});

  final List<String> values;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(JsoSpacing.md),
      decoration: BoxDecoration(
        color: JsoColors.surface,
        borderRadius: BorderRadius.circular(JsoRadius.card),
        border: Border.all(color: JsoColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var index = 0; index < values.length; index++) ...[
            if (index > 0) const SizedBox(height: JsoSpacing.sm),
            Text(
              values[index],
              style: const TextStyle(
                color: JsoColors.inkMuted,
                fontSize: 14,
                height: 1.45,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
