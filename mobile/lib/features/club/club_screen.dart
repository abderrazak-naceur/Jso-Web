import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../shared/widgets/jso_crest.dart';
import '../archive/archive_screen.dart';
import '../auth/admin_login_screen.dart';
import '../auth/auth_controller.dart';
import '../auth/profile_screen.dart';
import '../community/community_programs_screen.dart';
import '../documents/documents_screen.dart';
import '../events/events_screen.dart';
import '../faq/faq_screen.dart';
import '../media/media_screen.dart';
import '../sponsors/sponsors_screen.dart';
import '../teams/teams_screen.dart';

/// Fifth primary tab: account access and the club's secondary destinations.
class ClubScreen extends StatelessWidget {
  const ClubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final fan = auth.status == AuthStatus.authenticated ? auth.user : null;
    final discoveryDestinations = <_PlusDestination>[
      _PlusDestination(
        icon: Icons.groups_outlined,
        title: 'Équipe',
        subtitle: 'Effectif et staff de la JSO',
        onTap: () => _push(context, const TeamsScreen()),
      ),
      _PlusDestination(
        icon: Icons.calendar_month_outlined,
        title: 'Agenda du club',
        subtitle: 'Retrouvez les prochains rendez-vous',
        onTap: () => _push(context, const EventsScreen()),
      ),
      _PlusDestination(
        icon: Icons.photo_library_outlined,
        title: 'Médias',
        subtitle: 'Photos et vidéos de la JSO',
        onTap: () => _push(context, const MediaScreen()),
      ),
      _PlusDestination(
        icon: Icons.handshake_outlined,
        title: 'Sponsors',
        subtitle: 'Nos partenaires et soutiens',
        onTap: () => _push(context, const SponsorsScreen()),
      ),
    ];
    final clubDestinations = <_PlusDestination>[
      _PlusDestination(
        icon: Icons.description_outlined,
        title: 'Documents',
        subtitle: 'Ressources et fichiers du club',
        onTap: () => _push(context, const DocumentsScreen()),
      ),
      _PlusDestination(
        icon: Icons.help_outline_rounded,
        title: 'Questions fréquentes',
        subtitle: 'Les réponses à vos questions',
        onTap: () => _push(context, const FaqScreen()),
      ),
      _PlusDestination(
        icon: Icons.museum_outlined,
        title: 'Musée du club',
        subtitle: 'Revivez l’histoire de la JSO',
        onTap: () => _push(context, const ArchiveScreen()),
      ),
      _PlusDestination(
        icon: Icons.school_outlined,
        title: 'Écoles & partenaires',
        subtitle: 'Nos actions dans la communauté',
        onTap: () => _push(context, const CommunityProgramsScreen()),
      ),
    ];

    return Theme(
      data: JsoTheme.paper(),
      child: Scaffold(
        backgroundColor: JsoColors.paper,
        appBar: AppBar(
          title: const Text('Plus'),
          backgroundColor: JsoColors.paper,
          foregroundColor: JsoColors.inkText,
          // Hidden admin entry point: a long-press on the crest opens the
          // secure administrator login. Invisible to regular supporters.
          leading: Center(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onLongPress: () {
                Navigator.of(context).push(AdminLoginScreen.route());
              },
              child: const Padding(
                padding: EdgeInsets.only(left: JsoSpacing.sm),
                child: ExcludeSemantics(child: JsoCrest(size: 28)),
              ),
            ),
          ),
        ),
        body: LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 600 ? 2 : 1;
            final horizontalPadding = constraints.maxWidth > 920
                ? (constraints.maxWidth - 920) / 2
                : JsoSpacing.md;

            return CustomScrollView(
              key: const Key('plus-scroll-view'),
              slivers: [
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    JsoSpacing.md,
                    horizontalPadding,
                    JsoSpacing.sm,
                  ),
                  sliver: SliverToBoxAdapter(
                    child: _AccountCard(
                      displayName: fan?.displayName,
                      email: fan?.email,
                      onTap: () => _push(context, const ProfileScreen()),
                    ),
                  ),
                ),
                _SectionTitle(
                  title: 'À découvrir',
                  horizontalPadding: horizontalPadding,
                ),
                _destinationGrid(
                  discoveryDestinations,
                  columns: columns,
                  horizontalPadding: horizontalPadding,
                ),
                _SectionTitle(
                  title: 'Vie du club',
                  horizontalPadding: horizontalPadding,
                ),
                _destinationGrid(
                  clubDestinations,
                  columns: columns,
                  horizontalPadding: horizontalPadding,
                ),
                const SliverToBoxAdapter(
                  child: SizedBox(height: JsoSpacing.lg),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  static void _push(BuildContext context, Widget screen) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
  }

  static Widget _destinationGrid(
    List<_PlusDestination> destinations, {
    required int columns,
    required double horizontalPadding,
  }) {
    return SliverPadding(
      padding: EdgeInsets.fromLTRB(
        horizontalPadding,
        JsoSpacing.xs,
        horizontalPadding,
        JsoSpacing.sm,
      ),
      sliver: SliverGrid(
        delegate: SliverChildBuilderDelegate(
          (context, index) =>
              _DestinationCard(destination: destinations[index]),
          childCount: destinations.length,
        ),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          mainAxisExtent: 112,
          mainAxisSpacing: JsoSpacing.sm + JsoSpacing.xs,
          crossAxisSpacing: JsoSpacing.sm + JsoSpacing.xs,
        ),
      ),
    );
  }
}

class _AccountCard extends StatelessWidget {
  const _AccountCard({
    required this.displayName,
    required this.email,
    required this.onTap,
  });

  final String? displayName;
  final String? email;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final signedIn = displayName != null && email != null;
    final semanticsLabel = signedIn
        ? 'Mon compte. $displayName, $email'
        : 'Mon compte. Se connecter ou créer un compte';

    return Semantics(
      button: true,
      label: semanticsLabel,
      child: ExcludeSemantics(
        child: Material(
          color: JsoColors.navy,
          elevation: 3,
          shadowColor: const Color(0x330B1730),
          borderRadius: BorderRadius.circular(JsoRadius.largeCard),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(JsoSpacing.lg),
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 28,
                    backgroundColor: JsoColors.gold,
                    child: Icon(
                      Icons.person_outline_rounded,
                      color: JsoColors.navy,
                      size: 30,
                    ),
                  ),
                  const SizedBox(width: JsoSpacing.md),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Mon compte',
                          style: TextStyle(
                            color: JsoColors.gold,
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.4,
                          ),
                        ),
                        const SizedBox(height: JsoSpacing.xs),
                        Text(
                          signedIn
                              ? displayName!
                              : 'Se connecter ou créer un compte',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: JsoColors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        if (signedIn) ...[
                          const SizedBox(height: JsoSpacing.xs),
                          Text(
                            email!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: JsoColors.muted),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: JsoSpacing.sm),
                  const Icon(
                    Icons.arrow_forward_ios_rounded,
                    color: JsoColors.white,
                    size: 18,
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

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.horizontalPadding});

  final String title;
  final double horizontalPadding;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: EdgeInsets.fromLTRB(
        horizontalPadding,
        JsoSpacing.lg,
        horizontalPadding,
        JsoSpacing.sm,
      ),
      sliver: SliverToBoxAdapter(
        child: Text(
          title,
          style: const TextStyle(
            color: JsoColors.inkText,
            fontSize: 19,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class _PlusDestination {
  const _PlusDestination({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
}

class _DestinationCard extends StatelessWidget {
  const _DestinationCard({required this.destination});

  final _PlusDestination destination;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '${destination.title}. ${destination.subtitle}',
      child: ExcludeSemantics(
        child: Material(
          color: Colors.white,
          elevation: 1,
          shadowColor: const Color(0x240B1730),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(JsoRadius.card),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: destination.onTap,
            child: Padding(
              padding: const EdgeInsets.all(JsoSpacing.md),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3BF),
                      borderRadius: BorderRadius.circular(JsoRadius.control),
                    ),
                    child: Icon(
                      destination.icon,
                      color: JsoColors.navy,
                      size: 25,
                    ),
                  ),
                  const SizedBox(width: JsoSpacing.md),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          destination.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: JsoColors.inkText,
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: JsoSpacing.xs),
                        Text(
                          destination.subtitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: JsoColors.inkMuted,
                            fontSize: 13,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: JsoSpacing.xs),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: JsoColors.inkMuted,
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
