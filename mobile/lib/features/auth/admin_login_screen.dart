import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../shared/widgets/jso_crest.dart';
import 'admin_auth_controller.dart';
import 'login_screen.dart' show validateEmail;

/// Hidden administrator area, reached via a long-press on the JSO crest in the
/// "Plus" tab. Shows a login form when signed out, and a compact panel with
/// the connected admin's role and a logout button when signed in.
class AdminLoginScreen extends StatelessWidget {
  const AdminLoginScreen({super.key});

  static Route<void> route() =>
      MaterialPageRoute<void>(builder: (_) => const AdminLoginScreen());

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: JsoTheme.dark(),
      child: Scaffold(
        appBar: AppBar(title: const Text('Espace administrateur')),
        body: SafeArea(
          child: Consumer<AdminAuthController>(
            builder: (context, admin, _) => admin.isAuthenticated
                ? const _AdminConnectedView()
                : const _AdminLoginForm(),
          ),
        ),
      ),
    );
  }
}

class _AdminLoginForm extends StatefulWidget {
  const _AdminLoginForm();

  @override
  State<_AdminLoginForm> createState() => _AdminLoginFormState();
}

class _AdminLoginFormState extends State<_AdminLoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_formKey.currentState!.validate()) return;
    final admin = context.read<AdminAuthController>();
    setState(() => _submitting = true);
    final ok = await admin.login(
      _emailController.text.trim(),
      _passwordController.text,
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (!ok) {
      setState(() => _error = _frenchError(admin.errorMessage));
    }
  }

  static String _frenchError(String? message) {
    switch (message) {
      case 'Invalid credentials.':
        return 'Identifiants invalides.';
      case 'Email and password are required.':
        return 'E-mail et mot de passe sont obligatoires.';
      default:
        return 'Connexion impossible. Vérifiez vos identifiants.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(JsoSpacing.lg),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: JsoSpacing.md),
            const Center(child: JsoCrest(size: 72)),
            const SizedBox(height: JsoSpacing.lg),
            const Text(
              'ADMINISTRATION',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: JsoColors.gold,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Accès sécurisé au back office JSO',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: JsoColors.white,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: JsoSpacing.lg),
            if (_error != null) ...[
              _AdminErrorBanner(message: _error!),
              const SizedBox(height: JsoSpacing.md),
            ],
            TextFormField(
              controller: _emailController,
              enabled: !_submitting,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Adresse e-mail'),
              validator: validateEmail,
            ),
            const SizedBox(height: JsoSpacing.md),
            TextFormField(
              controller: _passwordController,
              enabled: !_submitting,
              obscureText: true,
              autofillHints: const [AutofillHints.password],
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(labelText: 'Mot de passe'),
              onFieldSubmitted: (_) => _submit(),
              validator: (value) => (value == null || value.isEmpty)
                  ? 'Le mot de passe est obligatoire.'
                  : null,
            ),
            const SizedBox(height: JsoSpacing.lg),
            ElevatedButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: JsoColors.ink,
                      ),
                    )
                  : const Text('Se connecter'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Compact panel shown once an administrator is authenticated.
class _AdminConnectedView extends StatelessWidget {
  const _AdminConnectedView();

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminAuthController>();
    final user = admin.user;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(JsoSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: JsoSpacing.md),
          const Center(child: JsoCrest(size: 72)),
          const SizedBox(height: JsoSpacing.lg),
          Container(
            padding: const EdgeInsets.all(JsoSpacing.lg),
            decoration: BoxDecoration(
              color: JsoColors.navy3,
              borderRadius: BorderRadius.circular(JsoRadius.largeCard),
              border: Border.all(color: JsoColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.verified_user_rounded,
                      color: JsoColors.gold,
                    ),
                    const SizedBox(width: JsoSpacing.sm),
                    Expanded(
                      child: Text(
                        'Connecté en tant que',
                        style: const TextStyle(
                          color: JsoColors.muted,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: JsoSpacing.sm),
                Text(
                  user?.displayName ?? 'Administrateur',
                  style: const TextStyle(
                    color: JsoColors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if ((user?.email ?? '').isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    user!.email,
                    style: const TextStyle(color: JsoColors.muted),
                  ),
                ],
                const SizedBox(height: JsoSpacing.md),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: JsoColors.gold,
                    borderRadius: BorderRadius.circular(JsoRadius.pill),
                  ),
                  child: Text(
                    _roleLabel(user?.role),
                    style: const TextStyle(
                      color: JsoColors.navy,
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: JsoSpacing.md),
          const Text(
            'La gestion complète du club se fait depuis le back office web. '
            'D’autres actions administrateur arriveront prochainement dans '
            'l’application.',
            style: TextStyle(color: JsoColors.muted, height: 1.4),
          ),
          const SizedBox(height: JsoSpacing.lg),
          OutlinedButton.icon(
            onPressed: () async {
              await context.read<AdminAuthController>().logout();
            },
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Se déconnecter'),
            style: OutlinedButton.styleFrom(
              foregroundColor: JsoColors.white,
              side: const BorderSide(color: JsoColors.borderHover),
              padding: const EdgeInsets.symmetric(vertical: JsoSpacing.md),
            ),
          ),
        ],
      ),
    );
  }

  /// Maps a backend role to a readable French label.
  static String _roleLabel(String? role) {
    switch (role) {
      case 'SuperAdmin':
        return 'Super administrateur';
      case 'ClubAdmin':
        return 'Administrateur du club';
      case 'Editor':
        return 'Éditeur';
      case 'MatchManager':
        return 'Responsable des matchs';
      case 'CommunityManager':
        return 'Responsable communauté';
      case 'ShopManager':
        return 'Responsable boutique';
      default:
        return role == null || role.isEmpty ? 'Administrateur' : role;
    }
  }
}

class _AdminErrorBanner extends StatelessWidget {
  const _AdminErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(JsoSpacing.md),
      decoration: BoxDecoration(
        color: JsoColors.navy2,
        borderRadius: BorderRadius.circular(JsoRadius.control),
        border: Border.all(color: Theme.of(context).colorScheme.error),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_outline,
            color: Theme.of(context).colorScheme.error,
            size: 20,
          ),
          const SizedBox(width: JsoSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: JsoColors.white),
            ),
          ),
        ],
      ),
    );
  }
}
