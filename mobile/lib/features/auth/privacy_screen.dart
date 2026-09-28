import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import 'auth_controller.dart';

/// RGPD self-service (idea E17): the fan can export a copy of their personal
/// data (`GET /fan/data-export`) and request account deletion
/// (`POST /fan/account-deletion`), which anonymises and signs them out.
class PrivacyScreen extends StatefulWidget {
  const PrivacyScreen({super.key});

  @override
  State<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends State<PrivacyScreen> {
  bool _exporting = false;
  bool _deleting = false;

  void _toast(ScaffoldMessengerState messenger, String message) {
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        backgroundColor: JsoColors.navy3,
        content: Text(message, style: const TextStyle(color: JsoColors.white)),
      ),
    );
  }

  Future<void> _export() async {
    setState(() => _exporting = true);
    final auth = context.read<AuthController>();
    final messenger = ScaffoldMessenger.of(context);
    try {
      final data = await auth.exportMyData();
      if (!mounted) return;
      setState(() => _exporting = false);
      _showExportSummary(data);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _exporting = false);
      _toast(messenger, describeApiError(e));
    }
  }

  void _showExportSummary(Map<String, dynamic> data) {
    final profile = data['profile'];
    final email = profile is Map ? '${profile['email'] ?? ''}' : '';
    final newsletters = (data['newsletterSubscriptions'] as List?)?.length ?? 0;
    final bricks = (data['supporterBricks'] as List?)?.length ?? 0;
    final ads = (data['classifiedAds'] as List?)?.length ?? 0;
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: JsoColors.navy2,
        title: const Text(
          'Vos données',
          style: TextStyle(color: JsoColors.white),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Voici un résumé des données que le club conserve à votre sujet.',
              style: const TextStyle(color: JsoColors.muted),
            ),
            const SizedBox(height: JsoSpacing.md),
            _line('Compte', email),
            _line('Inscriptions newsletter', '$newsletters'),
            _line('Briques de supporter', '$bricks'),
            _line('Petites annonces', '$ads'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  Widget _line(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: JsoColors.muted)),
        Text(
          value.isEmpty ? '—' : value,
          style: const TextStyle(
            color: JsoColors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    ),
  );

  Future<void> _confirmDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: JsoColors.navy2,
        title: const Text(
          'Supprimer le compte ?',
          style: TextStyle(color: JsoColors.white),
        ),
        content: const Text(
          'Votre compte sera anonymisé et désactivé. Cette action est '
          'irréversible et vous serez déconnecté.',
          style: TextStyle(color: JsoColors.muted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _deleting = true);
    final auth = context.read<AuthController>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      await auth.deleteAccount();
      if (!mounted) return;
      _toast(messenger, 'Votre compte a été supprimé.');
      navigator.popUntil((route) => route.isFirst);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _deleting = false);
      _toast(messenger, describeApiError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Confidentialité (RGPD)')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(JsoSpacing.lg),
          children: [
            const Text(
              'Vous contrôlez vos données personnelles.',
              style: TextStyle(
                color: JsoColors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: JsoSpacing.sm),
            const Text(
              'Exportez une copie de vos données ou demandez la suppression de '
              'votre compte à tout moment.',
              style: TextStyle(color: JsoColors.muted),
            ),
            const SizedBox(height: JsoSpacing.xl),
            OutlinedButton.icon(
              onPressed: _exporting ? null : _export,
              icon: _exporting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: JsoColors.gold,
                      ),
                    )
                  : const Icon(Icons.download_outlined),
              label: Text(_exporting ? 'Préparation…' : 'Exporter mes données'),
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
            ),
            const SizedBox(height: JsoSpacing.md),
            OutlinedButton.icon(
              onPressed: _deleting ? null : _confirmDelete,
              icon: _deleting
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Theme.of(context).colorScheme.error,
                      ),
                    )
                  : const Icon(Icons.delete_forever_outlined),
              label: Text(_deleting ? 'Suppression…' : 'Supprimer mon compte'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error,
                side: BorderSide(color: Theme.of(context).colorScheme.error),
                padding: const EdgeInsets.symmetric(
                  horizontal: JsoSpacing.lg,
                  vertical: JsoSpacing.md,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(JsoRadius.control),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
