import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/avatar_url.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/fan_user.dart';
import '../shop/my_orders_screen.dart';
import '../tickets/my_tickets_screen.dart';
import 'auth_controller.dart';
import 'change_password_screen.dart';
import 'edit_profile_screen.dart';
import 'login_screen.dart';
import 'privacy_screen.dart';
import 'register_screen.dart';

/// Fan account screen.
///
/// Reacts to [AuthController]: when authenticated it renders the current
/// [FanUser] from `/account/me` (display name, email and an "email vérifié"
/// badge) plus a "Se déconnecter" button; when anonymous it shows a call to
/// action to log in or create an account. While the session is still being
/// restored ([AuthStatus.unknown]) it shows a spinner.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Mon compte')),
      body: SafeArea(
        child: switch (auth.status) {
          AuthStatus.unknown => const Center(
            child: CircularProgressIndicator(color: JsoColors.gold),
          ),
          AuthStatus.authenticated => _AuthenticatedView(user: auth.user),
          AuthStatus.anonymous => const _AnonymousView(),
        },
      ),
    );
  }
}

class _AuthenticatedView extends StatelessWidget {
  const _AuthenticatedView({required this.user});

  final FanUser? user;

  @override
  Widget build(BuildContext context) {
    final fan = user;
    if (fan == null) {
      return const _AnonymousView();
    }
    return ListView(
      padding: const EdgeInsets.all(JsoSpacing.lg),
      children: [
        Center(
          child: CircleAvatar(
            radius: 40,
            backgroundColor: JsoColors.navy3,
            foregroundImage: NetworkImage(AvatarUrl.forSeed(fan.displayName)),
            // If the avatar fails to load (offline / unreachable host), fall
            // back to the initials shown in [child] instead of throwing.
            onForegroundImageError: (_, _) {},
            child: Text(
              _initials(fan.displayName),
              style: const TextStyle(
                color: JsoColors.gold,
                fontSize: 24,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
        const SizedBox(height: JsoSpacing.lg),
        Text(
          fan.displayName,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: JsoColors.white,
            fontSize: 22,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: JsoSpacing.xs),
        Text(
          fan.email,
          textAlign: TextAlign.center,
          style: const TextStyle(color: JsoColors.muted),
        ),
        const SizedBox(height: JsoSpacing.md),
        Center(child: _VerifiedBadge(verified: fan.emailVerified)),
        const SizedBox(height: JsoSpacing.xl),
        _ProfileAction(
          icon: Icons.confirmation_number_outlined,
          label: 'Mes billets',
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const MyTicketsScreen()),
          ),
        ),
        const SizedBox(height: JsoSpacing.md),
        _ProfileAction(
          icon: Icons.receipt_long_outlined,
          label: 'Mes commandes',
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const MyOrdersScreen()),
          ),
        ),
        const SizedBox(height: JsoSpacing.md),
        _ProfileAction(
          icon: Icons.edit_outlined,
          label: 'Modifier le profil',
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const EditProfileScreen()),
          ),
        ),
        const SizedBox(height: JsoSpacing.md),
        _ProfileAction(
          icon: Icons.lock_outline,
          label: 'Changer le mot de passe',
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => const ChangePasswordScreen(),
            ),
          ),
        ),
        const SizedBox(height: JsoSpacing.md),
        _ProfileAction(
          icon: Icons.privacy_tip_outlined,
          label: 'Confidentialité (RGPD)',
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const PrivacyScreen()),
          ),
        ),
        const SizedBox(height: JsoSpacing.md),
        ElevatedButton.icon(
          onPressed: () => context.read<AuthController>().logout(),
          icon: const Icon(Icons.logout),
          label: const Text('Se déconnecter'),
        ),
      ],
    );
  }

  static String _initials(String displayName) {
    final parts = displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) {
      return '?';
    }
    if (parts.length == 1) {
      return parts.first.substring(0, 1).toUpperCase();
    }
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
        .toUpperCase();
  }
}

/// A full-width gold-outlined action row used in the authenticated profile.
class _ProfileAction extends StatelessWidget {
  const _ProfileAction({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: JsoColors.gold,
        side: const BorderSide(color: JsoColors.gold),
        padding: const EdgeInsets.symmetric(
          horizontal: JsoSpacing.lg,
          vertical: JsoSpacing.md,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(JsoRadius.control),
        ),
        alignment: Alignment.centerLeft,
      ),
    );
  }
}

class _VerifiedBadge extends StatelessWidget {
  const _VerifiedBadge({required this.verified});

  final bool verified;

  @override
  Widget build(BuildContext context) {
    final label = verified ? 'E-mail vérifié' : 'E-mail non vérifié';
    final color = verified ? JsoColors.cyan : JsoColors.muted;
    final icon = verified ? Icons.verified : Icons.info_outline;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: JsoSpacing.md,
        vertical: JsoSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: JsoColors.navy2,
        borderRadius: BorderRadius.circular(JsoRadius.pill),
        border: Border.all(color: JsoColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: JsoSpacing.sm),
          Text(
            label,
            style: TextStyle(color: color, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _AnonymousView extends StatelessWidget {
  const _AnonymousView();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(JsoSpacing.lg),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(
            Icons.account_circle_outlined,
            size: 72,
            color: JsoColors.muted2,
          ),
          const SizedBox(height: JsoSpacing.md),
          const Text(
            'Rejoignez la communauté JSO',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: JsoColors.white,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: JsoSpacing.sm),
          const Text(
            'Connectez-vous ou créez un compte pour suivre le club de plus '
            'près.',
            textAlign: TextAlign.center,
            style: TextStyle(color: JsoColors.muted),
          ),
          const SizedBox(height: JsoSpacing.xl),
          ElevatedButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
            ),
            child: const Text('Se connecter'),
          ),
          const SizedBox(height: JsoSpacing.md),
          OutlinedButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const RegisterScreen()),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: JsoColors.gold,
              side: const BorderSide(color: JsoColors.gold),
              padding: const EdgeInsets.symmetric(
                horizontal: JsoSpacing.lg,
                vertical: JsoSpacing.md,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(JsoRadius.control),
              ),
            ),
            child: const Text('Créer un compte'),
          ),
        ],
      ),
    );
  }
}
