import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../shared/widgets/jso_crest.dart';
import '../auth/auth_controller.dart';
import '../auth/profile_screen.dart';
import '../shop/my_orders_screen.dart';
import '../tickets/my_tickets_screen.dart';
import '../club/club_screen.dart';

/// Account hub inspired by the approved JSO mobile mockups.
/// Uses the official bundled JSO crest and routes to existing, real app flows.
class AccountDashboardScreen extends StatelessWidget {
  const AccountDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final user = auth.user;
    final signedIn = auth.status == AuthStatus.authenticated && user != null;
    final name = user?.displayName ?? 'Supporter JSO';
    final initials = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part[0])
        .join()
        .toUpperCase();

    return Theme(
      data: JsoTheme.paper(),
      child: Scaffold(
        backgroundColor: JsoColors.paper,
        appBar: AppBar(
          title: const Text('Il mio account'),
          backgroundColor: JsoColors.paper,
          foregroundColor: JsoColors.inkText,
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: JsoSpacing.md),
              child: Center(child: JsoCrest(size: 34)),
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(
            JsoSpacing.md,
            JsoSpacing.sm,
            JsoSpacing.md,
            JsoSpacing.xl,
          ),
          children: [
            Container(
              padding: const EdgeInsets.all(JsoSpacing.lg),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [JsoColors.navy, Color(0xFF123F91), JsoColors.blue],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(JsoRadius.hero),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 68,
                        height: 68,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.12),
                          border: Border.all(color: JsoColors.gold, width: 2),
                        ),
                        alignment: Alignment.center,
                        child: signedIn
                            ? Text(
                                initials,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 22,
                                ),
                              )
                            : const Icon(
                                Icons.person_outline,
                                color: Colors.white,
                                size: 34,
                              ),
                      ),
                      const SizedBox(width: JsoSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'BENVENUTO NELLA FAMIGLIA JSO',
                              style: TextStyle(
                                color: JsoColors.gold,
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.1,
                              ),
                            ),
                            const SizedBox(height: JsoSpacing.xs),
                            Text(
                              name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 21,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              signedIn
                                  ? (user.email)
                                  : 'La tua passione, la nostra squadra.',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: JsoSpacing.md),
                  Row(
                    children: [
                      Icon(
                        signedIn
                            ? Icons.verified_rounded
                            : Icons.shield_outlined,
                        size: 17,
                        color: signedIn
                            ? const Color(0xFF5AF0B1)
                            : JsoColors.gold,
                      ),
                      const SizedBox(width: JsoSpacing.xs),
                      Text(
                        signedIn
                            ? 'Account connesso'
                            : 'Accedi per gestire i tuoi acquisti',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  if (!signedIn) ...[
                    const SizedBox(height: JsoSpacing.md),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: JsoColors.gold,
                          foregroundColor: JsoColors.navy,
                        ),
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const ProfileScreen(),
                          ),
                        ),
                        child: const Text(
                          'Accedi / Registrati',
                          style: TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: JsoSpacing.lg),
            const Text(
              'IL TUO SPAZIO',
              style: TextStyle(
                color: JsoColors.blue,
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: JsoSpacing.sm),
            _AccountAction(
              icon: Icons.confirmation_number_rounded,
              title: 'I miei biglietti',
              subtitle: 'Prenotazioni e QR code dei biglietti confermati',
              color: const Color(0xFF1769E0),
              onTap: () => _openProtected(
                context,
                signedIn,
                const MyTicketsScreen(),
                'Accedi per consultare i tuoi biglietti.',
              ),
            ),
            _AccountAction(
              icon: Icons.receipt_long_rounded,
              title: 'I miei ordini',
              subtitle: 'Acquisti e stato degli ordini',
              color: const Color(0xFF00875A),
              onTap: () => _openProtected(
                context,
                signedIn,
                const MyOrdersScreen(),
                'Accedi per consultare i tuoi ordini.',
              ),
            ),
            _AccountAction(
              icon: Icons.person_rounded,
              title: 'Profilo e sicurezza',
              subtitle: 'Dati personali, password e privacy',
              color: const Color(0xFF5B36C8),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const ProfileScreen()),
              ),
            ),
            _AccountAction(
              icon: Icons.workspace_premium_rounded,
              title: 'Abbonamenti',
              subtitle: 'Informazioni sulle iniziative e i servizi del club',
              color: const Color(0xFFB58100),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const ClubScreen()),
              ),
            ),
            const SizedBox(height: JsoSpacing.md),
            Container(
              padding: const EdgeInsets.all(JsoSpacing.md),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(JsoRadius.card),
                border: Border.all(color: JsoColors.borderLight),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.lock_rounded, color: JsoColors.blue),
                  SizedBox(width: JsoSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Acquisti più sicuri',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            color: JsoColors.inkText,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'La disponibilità dei biglietti e lo stato delle prenotazioni sono verificati tramite i servizi JSO.',
                          style: TextStyle(
                            color: JsoColors.inkMuted,
                            height: 1.4,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (signedIn) ...[
              const SizedBox(height: JsoSpacing.md),
              OutlinedButton.icon(
                onPressed: () => context.read<AuthController>().logout(),
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Esci dal tuo account'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static void _openProtected(
    BuildContext context,
    bool signedIn,
    Widget page,
    String message,
  ) {
    if (!signedIn) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
      Navigator.of(context)
          .push(MaterialPageRoute<void>(builder: (_) => const ProfileScreen()));
      return;
    }
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
  }
}

class _AccountAction extends StatelessWidget {
  const _AccountAction({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: JsoSpacing.sm),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(JsoRadius.card),
        side: const BorderSide(color: JsoColors.borderLight),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: JsoSpacing.md,
          vertical: JsoSpacing.xs,
        ),
        leading: Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: color),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: JsoColors.inkText,
            fontWeight: FontWeight.w900,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            subtitle,
            style: const TextStyle(color: JsoColors.inkMuted, fontSize: 12),
          ),
        ),
        trailing: const Icon(
          Icons.chevron_right_rounded,
          color: JsoColors.inkMuted,
        ),
        onTap: onTap,
      ),
    );
  }
}
