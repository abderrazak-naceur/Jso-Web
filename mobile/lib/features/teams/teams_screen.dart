import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/team.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/jso_crest.dart';
import '../../shared/widgets/loading_view.dart';
import 'team_roster_screen.dart';

/// Teams list: the squads from `GET /api/teams`; tapping a team opens its
/// roster from `GET /api/teams/{id}/players`.
class TeamsScreen extends StatefulWidget {
  const TeamsScreen({super.key});

  @override
  State<TeamsScreen> createState() => _TeamsScreenState();
}

class _TeamsScreenState extends State<TeamsScreen> {
  late Future<List<Team>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<PublicApiRepository>().getTeams();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Équipes')),
      body: FutureBuilder<List<Team>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement des équipes…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Impossible de charger les équipes.',
              onRetry: () => setState(_load),
            );
          }

          final teams = snapshot.data ?? const <Team>[];
          if (teams.isEmpty) {
            return const EmptyView(
              message: 'Aucune équipe pour le moment.',
              icon: Icons.groups_outlined,
            );
          }

          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: _TeamsCarousel(teams: teams),
          );
        },
      ),
    );
  }
}

/// Horizontal Swiper-style carousel of team cards: swipe between slides, with
/// prev/next arrows and clickable pagination bullets. A [PageView] with a
/// fractional viewport lets the neighbouring card peek in, matching the
/// reference carousel layout.
class _TeamsCarousel extends StatefulWidget {
  const _TeamsCarousel({required this.teams});

  final List<Team> teams;

  @override
  State<_TeamsCarousel> createState() => _TeamsCarouselState();
}

class _TeamsCarouselState extends State<_TeamsCarousel> {
  late final PageController _controller;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _controller = PageController(viewportFraction: 0.86);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _goTo(int index) {
    final target = index.clamp(0, widget.teams.length - 1);
    _controller.animateToPage(
      target,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final teams = widget.teams;
    final canPrev = _page > 0;
    final canNext = _page < teams.length - 1;

    return Column(
      children: [
        const SizedBox(height: JsoSpacing.sm),
        Expanded(
          child: PageView.builder(
            controller: _controller,
            physics: const BouncingScrollPhysics(),
            onPageChanged: (i) => setState(() => _page = i),
            itemCount: teams.length,
            itemBuilder: (context, i) {
              return Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: JsoSpacing.sm,
                  vertical: JsoSpacing.md,
                ),
                child: _TeamCarouselCard(team: teams[i]),
              );
            },
          ),
        ),
        const SizedBox(height: JsoSpacing.sm),
        // Prev / next arrows, like the reference carousel.
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _CarouselArrow(
              icon: Icons.arrow_back_rounded,
              tooltip: 'Précédent',
              onPressed: canPrev ? () => _goTo(_page - 1) : null,
            ),
            const SizedBox(width: JsoSpacing.md),
            _CarouselArrow(
              icon: Icons.arrow_forward_rounded,
              tooltip: 'Suivant',
              onPressed: canNext ? () => _goTo(_page + 1) : null,
            ),
          ],
        ),
        const SizedBox(height: JsoSpacing.md),
        // Clickable pagination bullets.
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < teams.length; i++)
              GestureDetector(
                onTap: () => _goTo(i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: i == _page ? 22 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: i == _page ? JsoColors.gold : JsoColors.muted2,
                    borderRadius: BorderRadius.circular(JsoRadius.pill),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: JsoSpacing.lg),
      ],
    );
  }
}

class _CarouselArrow extends StatelessWidget {
  const _CarouselArrow({
    required this.icon,
    required this.tooltip,
    this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    return Material(
      color: enabled ? JsoColors.navy : JsoColors.navy2,
      shape: const CircleBorder(),
      child: IconButton(
        tooltip: tooltip,
        onPressed: onPressed,
        color: enabled ? JsoColors.gold : JsoColors.muted2,
        icon: Icon(icon),
      ),
    );
  }
}

/// A full-height slide card for one team, used inside [_TeamsCarousel].
class _TeamCarouselCard extends StatelessWidget {
  const _TeamCarouselCard({required this.team});

  final Team team;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: JsoColors.navy2,
      borderRadius: BorderRadius.circular(JsoRadius.hero),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) =>
                TeamRosterScreen(teamId: team.id, teamName: team.name),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top hero band: brand gradient with the crest centred.
            Expanded(
              flex: 5,
              child: DecoratedBox(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [JsoColors.navy3, JsoColors.navy, JsoColors.ink],
                  ),
                ),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.all(JsoSpacing.lg),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0x14FFFFFF),
                      border: Border.all(color: JsoColors.gold, width: 2),
                    ),
                    child: const JsoCrest(size: 88),
                  ),
                ),
              ),
            ),
            // Bottom info band.
            Expanded(
              flex: 4,
              child: Padding(
                padding: const EdgeInsets.all(JsoSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0x14FFFFFF),
                        borderRadius: BorderRadius.circular(JsoRadius.pill),
                        border: Border.all(color: JsoColors.border),
                      ),
                      child: Text(
                        team.category.toUpperCase(),
                        style: const TextStyle(
                          color: JsoColors.gold2,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ),
                    const SizedBox(height: JsoSpacing.sm),
                    Text(
                      team.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: JsoColors.white,
                        fontSize: 22,
                        height: 1.1,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: JsoSpacing.md),
                    Row(
                      children: [
                        const Icon(
                          Icons.groups_rounded,
                          color: JsoColors.gold,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${team.playersCount} '
                          '${team.playersCount <= 1 ? 'joueur' : 'joueurs'}',
                          style: const TextStyle(
                            color: JsoColors.muted,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const Spacer(),
                        const Text(
                          'Voir l’effectif',
                          style: TextStyle(
                            color: JsoColors.gold,
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const Icon(
                          Icons.chevron_right_rounded,
                          color: JsoColors.gold,
                          size: 20,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
