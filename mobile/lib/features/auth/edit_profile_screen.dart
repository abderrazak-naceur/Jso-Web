import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../shared/format.dart';
import '../../shared/snackbars.dart';
import 'auth_controller.dart';

/// Edit the signed-in fan's identity, contact details and birthday preferences.
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
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _phoneNumber;
  late final String _initialFirstName;
  late final String _initialLastName;
  late final String _initialPhoneNumber;
  DateTime? _birthDate;
  bool _optIn = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthController>().user;
    _displayName = TextEditingController(text: user?.displayName ?? '');
    _initialFirstName = user?.firstName ?? '';
    _initialLastName = user?.lastName ?? '';
    _initialPhoneNumber = user?.phoneNumber ?? '';
    _firstName = TextEditingController(text: _initialFirstName);
    _lastName = TextEditingController(text: _initialLastName);
    _phoneNumber = TextEditingController(text: _initialPhoneNumber);
    _birthDate = user?.birthDate;
    _optIn = user?.anniversaryOptIn ?? false;
  }

  @override
  void dispose() {
    _displayName.dispose();
    _firstName.dispose();
    _lastName.dispose();
    _phoneNumber.dispose();
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
        firstName: _firstName.text.trim() == _initialFirstName
            ? null
            : _firstName.text.trim(),
        lastName: _lastName.text.trim() == _initialLastName
            ? null
            : _lastName.text.trim(),
        phoneNumber: _phoneNumber.text.trim() == _initialPhoneNumber
            ? null
            : _phoneNumber.text.trim(),
        birthDate: _birthDate,
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
                controller: _firstName,
                style: const TextStyle(color: JsoColors.white),
                decoration: const InputDecoration(labelText: 'Prénom'),
                textInputAction: TextInputAction.next,
                validator: (value) =>
                    (value ?? '').trim().isEmpty &&
                        _lastName.text.trim().isNotEmpty
                    ? 'Le prénom est requis.'
                    : null,
              ),
              const SizedBox(height: JsoSpacing.md),
              TextFormField(
                controller: _lastName,
                style: const TextStyle(color: JsoColors.white),
                decoration: const InputDecoration(labelText: 'Nom'),
                textInputAction: TextInputAction.next,
                validator: (value) =>
                    (value ?? '').trim().isEmpty &&
                        _firstName.text.trim().isNotEmpty
                    ? 'Le nom est requis.'
                    : null,
              ),
              const SizedBox(height: JsoSpacing.md),
              TextFormField(
                controller: _phoneNumber,
                style: const TextStyle(color: JsoColors.white),
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Téléphone'),
                textInputAction: TextInputAction.next,
                validator: (value) =>
                    (value ?? '').isNotEmpty &&
                        (value ?? '').replaceAll(RegExp(r'\D'), '').length < 7
                    ? 'Numéro de téléphone invalide.'
                    : null,
              ),
              const SizedBox(height: JsoSpacing.md),
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
              _BirthdayField(date: _birthDate, onTap: _pickBirthDate),
              const SizedBox(height: JsoSpacing.md),
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
                  'Choix facultatif, indépendant de votre profil.',
                  style: TextStyle(color: JsoColors.muted),
                ),
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
