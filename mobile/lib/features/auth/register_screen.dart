import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import 'auth_controller.dart';
import 'login_screen.dart';

/// Minimum password length enforced by the backend (`AccountController`).
const int kMinPasswordLength = 12;

/// French registration form for a new fan account.
///
/// Collects email, display name and password, mirrors the backend rule that a
/// password must be at least [kMinPasswordLength] characters (client-side hint
/// plus validation), and still surfaces the server-provided error on a 400. A
/// 409 conflict is shown as "Un compte existe déjà avec cet email.". On success
/// the [AuthController] has already stored the token, so the screen pops back.
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _displayNameController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _displayNameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_formKey.currentState!.validate()) {
      return;
    }
    final auth = context.read<AuthController>();
    setState(() => _submitting = true);
    final ok = await auth.register(
      _emailController.text.trim(),
      _displayNameController.text.trim(),
      _passwordController.text,
    );
    if (!mounted) {
      return;
    }
    setState(() => _submitting = false);
    if (ok) {
      Navigator.of(context).pop();
    } else {
      setState(() => _error = frenchAuthError(auth.errorMessage));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Créer un compte')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(JsoSpacing.lg),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Rejoignez la communauté des supporters',
                  style: TextStyle(
                    color: JsoColors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: JsoSpacing.lg),
                if (_error != null) ...[
                  _RegisterErrorBanner(message: _error!),
                  const SizedBox(height: JsoSpacing.md),
                ],
                TextFormField(
                  controller: _emailController,
                  enabled: !_submitting,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Adresse e-mail',
                  ),
                  validator: validateEmail,
                ),
                const SizedBox(height: JsoSpacing.md),
                TextFormField(
                  controller: _displayNameController,
                  enabled: !_submitting,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.name],
                  decoration: const InputDecoration(labelText: "Nom affiché"),
                  validator: (value) => (value == null || value.trim().isEmpty)
                      ? 'Le nom affiché est obligatoire.'
                      : null,
                ),
                const SizedBox(height: JsoSpacing.md),
                TextFormField(
                  controller: _passwordController,
                  enabled: !_submitting,
                  obscureText: true,
                  autofillHints: const [AutofillHints.newPassword],
                  textInputAction: TextInputAction.done,
                  decoration: const InputDecoration(
                    labelText: 'Mot de passe',
                    helperText: 'Au moins $kMinPasswordLength caractères.',
                    helperMaxLines: 2,
                  ),
                  onFieldSubmitted: (_) => _submit(),
                  validator: (value) {
                    final password = value ?? '';
                    if (password.isEmpty) {
                      return 'Le mot de passe est obligatoire.';
                    }
                    if (password.length < kMinPasswordLength) {
                      return 'Le mot de passe doit contenir au moins '
                          '$kMinPasswordLength caractères.';
                    }
                    return null;
                  },
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
                      : const Text('Créer mon compte'),
                ),
                const SizedBox(height: JsoSpacing.md),
                TextButton(
                  onPressed: _submitting
                      ? null
                      : () => Navigator.of(context).pop(),
                  child: const Text('Déjà inscrit ? Se connecter'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Inline error banner for the registration form (mirrors the login one).
class _RegisterErrorBanner extends StatelessWidget {
  const _RegisterErrorBanner({required this.message});

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
