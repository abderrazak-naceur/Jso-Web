import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../shared/widgets/jso_crest.dart';
import '../../data/models/payment_history_item.dart';
import '../../data/repositories/payment_history_repository.dart';
import '../../shared/format.dart';
import '../auth/admin_login_screen.dart';
import '../auth/auth_controller.dart';
import '../auth/profile_screen.dart';
import '../shop/my_orders_screen.dart';
import '../shop/shop_screen.dart';
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
          title: const Text('Mon compte'),
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
                              'BIENVENUE DANS LA FAMILLE JSO',
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
                                  : 'Votre passion, notre équipe.',
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
                            ? 'Compte connecté'
                            : 'Connectez-vous pour gérer vos achats',
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
                          'Se connecter / S’inscrire',
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
              'VOTRE ESPACE',
              style: TextStyle(
                color: JsoColors.blue,
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: JsoSpacing.sm),
            _AccountAction(
              icon: Icons.admin_panel_settings_rounded,
              title: 'Administration du club',
              subtitle: 'Gestion complète, dons, contenus et billets',
              color: JsoColors.gold,
              featured: true,
              onTap: () => Navigator.of(context).push(AdminLoginScreen.route()),
            ),
            _AccountAction(
              icon: Icons.confirmation_number_rounded,
              title: 'Mes billets',
              subtitle: 'Réservations et QR codes des billets confirmés',
              color: const Color(0xFF1769E0),
              onTap: () => _openProtected(
                context,
                signedIn,
                const MyTicketsScreen(),
                'Connectez-vous pour consulter vos billets.',
              ),
            ),
            _AccountAction(
              icon: Icons.receipt_long_rounded,
              title: 'Mes commandes',
              subtitle: 'Achats et suivi des commandes',
              color: const Color(0xFF00875A),
              onTap: () => _openProtected(
                context,
                signedIn,
                const MyOrdersScreen(),
                'Connectez-vous pour consulter vos commandes.',
              ),
            ),
            _AccountAction(
              icon: Icons.person_rounded,
              title: 'Profil et sécurité',
              subtitle: 'Données personnelles, mot de passe et confidentialité',
              color: const Color(0xFF5B36C8),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const ProfileScreen()),
              ),
            ),
            _AccountAction(
              icon: Icons.workspace_premium_rounded,
              title: 'Explorer le club',
              subtitle: 'Équipe, agenda, médias, documents et partenaires',
              color: const Color(0xFFB58100),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const ClubScreen()),
              ),
            ),
            _AccountAction(
              icon: Icons.storefront_rounded,
              title: 'Boutique officielle',
              subtitle: 'Maillots et articles de la JSO',
              color: const Color(0xFF126D8F),
              onTap: () => Navigator.of(context).push(ShopScreen.route()),
            ),
            const SizedBox(height: JsoSpacing.md),
            _PaymentHistoryPanel(signedIn: signedIn),
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
                          'Des achats plus sûrs',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            color: JsoColors.inkText,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'La disponibilité des billets et les réservations sont vérifiées par les services JSO.',
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
                label: const Text('Se déconnecter'),
              ),
            ],
            const SizedBox(height: JsoSpacing.xl),
            const Center(
              child: Text(
                'JSO Mobile · Version 1.0.1 (Build 2)',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: JsoColors.inkMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
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

class _PaymentHistoryPanel extends StatefulWidget {
  const _PaymentHistoryPanel({required this.signedIn});

  final bool signedIn;

  @override
  State<_PaymentHistoryPanel> createState() => _PaymentHistoryPanelState();
}

class _PaymentHistoryPanelState extends State<_PaymentHistoryPanel> {
  Future<List<PaymentHistoryItem>>? _future;

  @override
  void initState() {
    super.initState();
    if (widget.signedIn) _load();
  }

  @override
  void didUpdateWidget(covariant _PaymentHistoryPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.signedIn && !oldWidget.signedIn) _load();
  }

  void _load() {
    final token = context.read<AuthController>().accessToken;
    _future = token == null
        ? Future.error(StateError('not-authenticated'))
        : context.read<PaymentHistoryRepository>().mine(token);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(JsoRadius.card),
        side: const BorderSide(color: JsoColors.borderLight),
      ),
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Historique des paiements',
              style: TextStyle(
                color: JsoColors.inkText,
                fontSize: 17,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Billets, boutique, abonnements, dons et accès aux directs.',
              style: TextStyle(color: JsoColors.inkMuted, fontSize: 12),
            ),
            const SizedBox(height: JsoSpacing.sm),
            if (!widget.signedIn)
              const Text('Connectez-vous pour voir vos opérations.')
            else if (_future == null)
              const Center(child: CircularProgressIndicator())
            else
              FutureBuilder<List<PaymentHistoryItem>>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.all(JsoSpacing.md),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  if (snapshot.hasError) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Impossible de charger vos paiements. Réessayez.',
                          style: TextStyle(color: JsoColors.inkMuted),
                        ),
                        TextButton.icon(
                          onPressed: () => setState(_load),
                          icon: const Icon(Icons.refresh_rounded),
                          label: const Text('Réessayer'),
                        ),
                      ],
                    );
                  }
                  final items = snapshot.data ?? const <PaymentHistoryItem>[];
                  if (items.isEmpty) {
                    return const Text(
                      'Vos achats et paiements, y compris les billets de match, apparaîtront ici.',
                      style: TextStyle(color: JsoColors.inkMuted, height: 1.4),
                    );
                  }
                  return Column(
                    children: [
                      for (final item in items) _PaymentHistoryRow(item: item),
                    ],
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _PaymentHistoryRow extends StatelessWidget {
  const _PaymentHistoryRow({required this.item});

  final PaymentHistoryItem item;

  @override
  Widget build(BuildContext context) {
    final date = item.activityDate;
    final paid = const [
      'Paid',
      'Confirmed',
      'CheckedIn',
      'Active',
    ].contains(item.status);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: JsoSpacing.sm),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: JsoColors.borderLight)),
      ),
      child: Row(
        children: [
          Icon(
            item.type == 'ticket'
                ? Icons.confirmation_number_rounded
                : Icons.credit_card_rounded,
            color: JsoColors.blue,
          ),
          const SizedBox(width: JsoSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: JsoColors.inkText,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
                Text(
                  [
                    if (date != null) JsoFormat.date(date),
                    if (item.provider?.isNotEmpty == true) item.provider!,
                    item.statusLabel,
                  ].join(' · '),
                  style: const TextStyle(
                    color: JsoColors.inkMuted,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: JsoSpacing.xs),
          Text(
            JsoFormat.money(item.amount, item.currency),
            textAlign: TextAlign.end,
            style: TextStyle(
              color: paid ? const Color(0xFF00875A) : JsoColors.inkText,
              fontWeight: FontWeight.w900,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _AccountAction extends StatelessWidget {
  const _AccountAction({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
    this.featured = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;
  final bool featured;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: featured ? JsoColors.navy : Colors.white,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: JsoSpacing.sm),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(JsoRadius.card),
        side: BorderSide(
          color: featured ? JsoColors.navy2 : JsoColors.borderLight,
        ),
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
            color: color.withValues(alpha: featured ? 0.17 : 0.10),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: color),
        ),
        title: Text(
          title,
          style: TextStyle(
            color: featured ? JsoColors.white : JsoColors.inkText,
            fontWeight: FontWeight.w900,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            subtitle,
            style: TextStyle(
              color: featured ? JsoColors.muted : JsoColors.inkMuted,
              fontSize: 12,
            ),
          ),
        ),
        trailing: Icon(
          Icons.chevron_right_rounded,
          color: featured ? JsoColors.gold : JsoColors.inkMuted,
        ),
        onTap: onTap,
      ),
    );
  }
}
