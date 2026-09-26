import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';
import '../sponsors/sponsors_screen.dart';
import '../teams/teams_screen.dart';

/// Club tab: a small landing screen that links to the Team/Roster and
/// Sponsors areas. Hosting both behind one tab keeps the fixed
/// bottom-navigation bar usable (five tabs rather than six).
class ClubScreen extends StatelessWidget {
  const ClubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Club')),
      body: ListView(
        padding: const EdgeInsets.all(JsoSpacing.md),
        children: [
          _ClubCard(
            icon: Icons.groups,
            title: 'Teams & Roster',
            subtitle: 'Browse the squads and their players.',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const TeamsScreen()),
            ),
          ),
          _ClubCard(
            icon: Icons.handshake,
            title: 'Sponsors',
            subtitle: 'Discover the partners who support the club.',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const SponsorsScreen()),
            ),
          ),
        ],
      ),
    );
  }
}

class _ClubCard extends StatelessWidget {
  const _ClubCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(JsoRadius.card),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(JsoSpacing.lg),
          child: Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: JsoColors.navy2,
                child: Icon(icon, color: JsoColors.gold, size: 28),
              ),
              const SizedBox(width: JsoSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: JsoColors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                      ),
                    ),
                    const SizedBox(height: JsoSpacing.xs),
                    Text(
                      subtitle,
                      style: const TextStyle(color: JsoColors.muted),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: JsoColors.muted2),
            ],
          ),
        ),
      ),
    );
  }
}
