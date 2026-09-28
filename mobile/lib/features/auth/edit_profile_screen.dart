import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../shared/format.dart';
import '../../shared/snackbars.dart';
import 'auth_controller.dart';

/// Edit the signed-in fan's profile (idea A3): display name, and an optional
/// birthday kept only while the anniversary opt-in is on (RGPD-friendly).
///
/// Persists through `AuthController.updateProfile` (PUT /account/me); the
/// controller refreshes the shared [FanUser] so the profile screen updates.
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _displayName;
  DateTime? _birthDate;
  bool _optIn = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthController>().user;
    _displayName = TextEditingController(text: user?.displayName ?? '');
    _birthDate = user?.birthDate;
    _optIn = user?.anniversaryOptIn ?? false;
  }

  @override
  void dispose() {
    _displayName.dispose();
    super.dispose();
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final initial = _birthDate ?? DateTime(now.year - 20, 1, 1);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: now,
      helpText: 'Date de naissance',
    );
    if (picked != null) setState(() => _birthDate = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final auth = context.read<AuthController>();
    try {
      await auth.updateProfile(
        displayName: _displayName.text.trim(),
        // Only send the birthday when the opt-in is on; turning it off clears
        // it server-side (data minimisation).
        birthDate: _optIn ? _birthDate : null,
        anniversaryOptIn: _optIn,
      );
      if (!mounted) return;
      showJsoMessage(context, 'Profil mis à jour.');
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
      appBar: AppBar(title: const Text('Modifier le profil')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(JsoSpacing.lg),
            children: [
              TextFormField(
                controller: _displayName,
                style: const TextStyle(color: JsoColors.white),
                decoration: const InputDecoration(
                  labelText: 'Nom affiché',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                textInputAction: TextInputAction.done,
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Le nom affiché est requis.'
                    : null,
              ),
              const SizedBox(height: JsoSpacing.lg),
              SwitchListTile(
                value: _optIn,
                onChanged: (v) => setState(() => _optIn = v),
                activeThumbColor: JsoColors.gold,
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  'Recevoir un message d’anniversaire',
                  style: TextStyle(color: JsoColors.white),
                ),
                subtitle: const Text(
                  'Votre date de naissance n’est conservée que si cette option '
                  'est activée.',
                  style: TextStyle(color: JsoColors.muted),
                ),
              ),
              if (_optIn) ...[
                const SizedBox(height: JsoSpacing.sm),
                _BirthdayField(date: _birthDate, onTap: _pickBirthDate),
              ],
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
                    : const Icon(Icons.save_outlined),
                label: Text(_saving ? 'Enregistrement…' : 'Enregistrer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BirthdayField extends StatelessWidget {
  const _BirthdayField({required this.date, required this.onTap});

  final DateTime? date;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(JsoRadius.control),
      child: InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Date de naissance',
          prefixIcon: Icon(Icons.cake_outlined),
        ),
        child: Text(
          date == null ? 'Choisir une date' : JsoFormat.date(date!),
          style: TextStyle(
            color: date == null ? JsoColors.muted : JsoColors.white,
          ),
        ),
      ),
    );
  }
}
