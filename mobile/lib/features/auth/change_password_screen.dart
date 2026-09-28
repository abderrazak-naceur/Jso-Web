import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../shared/snackbars.dart';
import 'auth_controller.dart';

/// Change the signed-in fan's password (`POST /account/change-password`).
///
/// Mirrors the backend rule (new password ≥ 12 characters) locally and
/// surfaces the server message (e.g. wrong current password) in French.
class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final auth = context.read<AuthController>();
    try {
      await auth.changePassword(
        currentPassword: _current.text,
        newPassword: _next.text,
      );
      if (!mounted) return;
      showJsoMessage(context, 'Mot de passe mis à jour.');
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      showJsoMessage(context, describeApiError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Changer le mot de passe')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(JsoSpacing.lg),
            children: [
              TextFormField(
                controller: _current,
                obscureText: true,
                style: const TextStyle(color: JsoColors.white),
                decoration: const InputDecoration(
                  labelText: 'Mot de passe actuel',
                  prefixIcon: Icon(Icons.lock_outline),
                ),
                validator: (v) => (v == null || v.isEmpty)
                    ? 'Le mot de passe actuel est requis.'
                    : null,
              ),
              const SizedBox(height: JsoSpacing.md),
              TextFormField(
                controller: _next,
                obscureText: true,
                style: const TextStyle(color: JsoColors.white),
                decoration: const InputDecoration(
                  labelText: 'Nouveau mot de passe',
                  prefixIcon: Icon(Icons.lock_reset_outlined),
                ),
                validator: (v) => (v == null || v.length < 12)
                    ? 'Au moins 12 caractères.'
                    : null,
              ),
              const SizedBox(height: JsoSpacing.md),
              TextFormField(
                controller: _confirm,
                obscureText: true,
                style: const TextStyle(color: JsoColors.white),
                decoration: const InputDecoration(
                  labelText: 'Confirmer le nouveau mot de passe',
                  prefixIcon: Icon(Icons.lock_reset_outlined),
                ),
                textInputAction: TextInputAction.done,
                validator: (v) => (v != _next.text)
                    ? 'Les mots de passe ne correspondent pas.'
                    : null,
              ),
              const SizedBox(height: JsoSpacing.xl),
              ElevatedButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: JsoColors.ink,
                        ),
                      )
                    : const Icon(Icons.check),
                label: Text(_saving ? 'Enregistrement…' : 'Mettre à jour'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
