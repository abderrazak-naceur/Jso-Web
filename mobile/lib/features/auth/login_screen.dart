import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import 'auth_controller.dart';
import 'register_screen.dart';

/// French login form for the fan account.
///
/// Collects an email and password, validates them locally, then delegates to
/// [AuthController.login]. While the request is in flight the submit button is
/// disabled and shows a spinner; on failure an inline French error is shown and
/// the user stays on the form. On success the screen pops back to its caller
/// (typically the profile screen), which reacts to the authenticated state.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
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
    if (!_formKey.currentState!.validate()) {
      return;
    }
    final auth = context.read<AuthController>();
    setState(() => _submitting = true);
    final ok = await auth.login(
      _emailController.text.trim(),
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

  void _goToRegister() {
    Navigator.of(context)
        .push(MaterialPageRoute<void>(builder: (_) => const RegisterScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Connexion')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(JsoSpacing.lg),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Connectez-vous à votre compte supporter',
                  style: TextStyle(
                    color: JsoColors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: JsoSpacing.lg),
                if (_error != null) ...[
                  _ErrorBanner(message: _error!),
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
                const SizedBox(height: JsoSpacing.md),
                TextButton(
                  onPressed: _submitting ? null : _goToRegister,
                  child: const Text('Pas encore de compte ? Créer un compte'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Inline error banner used by the auth forms.
class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

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

/// Validates an email field with a French message.
String? validateEmail(String? value) {
  final email = value?.trim() ?? '';
  if (email.isEmpty) {
    return "L'adresse e-mail est obligatoire.";
  }
  // Deliberately lenient: reject only obviously malformed input.
  final looksValid = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email);
  if (!looksValid) {
    return 'Veuillez saisir une adresse e-mail valide.';
  }
  return null;
}

/// Maps an [AuthController.errorMessage] (English default text keyed off the
/// [ApiException] subclass) to the French copy shown to supporters.
///
/// The controller surfaces the default [ApiException] messages
/// (see `api_exception.dart`); we translate them here so the UI owns the
/// French wording.
String frenchAuthError(String? controllerMessage) {
  // These literals match the default messages on the auth [ApiException]
  // subclasses in `api_exception.dart`.
  switch (controllerMessage) {
    case 'Invalid credentials.':
      return 'Identifiants invalides.';
    case 'Email already in use.':
      return 'Un compte existe déjà avec cet email.';
    case 'Validation failed.':
      return 'Le mot de passe doit contenir au moins 12 caractères.';
    default:
      return 'Une erreur est survenue. Veuillez réessayer.';
  }
}
