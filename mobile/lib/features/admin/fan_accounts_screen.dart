import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_exception.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/admin_fan_account.dart';
import '../../data/repositories/admin_fan_accounts_repository.dart';
import '../auth/admin_auth_controller.dart';

/// Mobile counterpart to the web admin's fan-account module.
class FanAccountsScreen extends StatefulWidget {
  const FanAccountsScreen({super.key});

  static Route<void> route() =>
      MaterialPageRoute<void>(builder: (_) => const FanAccountsScreen());

  @override
  State<FanAccountsScreen> createState() => _FanAccountsScreenState();
}

class _FanAccountsScreenState extends State<FanAccountsScreen> {
  final _search = TextEditingController();
  List<AdminFanAccount> _accounts = const [];
  bool _loading = true;
  String? _error;
  String? _notice;
  String _status = 'all';
  String _vip = 'all';
  String? _busyId;

  String? get _token => context.read<AdminAuthController>().accessToken;
  AdminFanAccountsRepository get _repository =>
      context.read<AdminFanAccountsRepository>();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final token = _token;
    if (token == null) {
      setState(() {
        _loading = false;
        _error = 'Session administrateur expirée. Reconnectez-vous.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final accounts = await _repository.list(
        adminToken: token,
        query: _search.text,
      );
      if (!mounted) return;
      setState(() {
        _accounts = accounts;
        _loading = false;
      });
    } on ApiException {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Impossible de charger les supporters. Vérifiez votre accès puis réessayez.';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Une erreur inattendue est survenue.';
      });
    }
  }

  List<AdminFanAccount> get _filtered => _accounts
      .where((account) {
        final statusMatch =
            _status == 'all' ||
            (_status == 'active' && account.isActive) ||
            (_status == 'blocked' && !account.isActive);
        final vipMatch =
            _vip == 'all' ||
            (_vip == 'vip' && account.isVip) ||
            (_vip == 'standard' && !account.isVip);
        return statusMatch && vipMatch;
      })
      .toList(growable: false);

  Future<void> _toggleStatus(AdminFanAccount account) async {
    final next = !account.isActive;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(next ? 'Réactiver le compte ?' : 'Bloquer le compte ?'),
        content: Text(
          next
              ? 'Le supporter pourra accéder de nouveau à son compte.'
              : 'Le supporter ne pourra plus utiliser son compte.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(next ? 'Réactiver' : 'Bloquer'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final token = _token;
    if (token == null) return;
    setState(() {
      _busyId = account.id;
      _error = null;
      _notice = null;
    });
    try {
      await _repository.setActive(
        adminToken: token,
        accountId: account.id,
        isActive: next,
      );
      if (!mounted) return;
      setState(() {
        _accounts = _accounts
            .map(
              (item) =>
                  item.id == account.id ? item.copyWith(isActive: next) : item,
            )
            .toList(growable: false);
        _notice = next ? 'Compte réactivé.' : 'Compte bloqué.';
      });
    } on ApiException {
      if (!mounted) return;
      setState(() {
        _error = 'Impossible de modifier le statut du compte.';
      });
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _setRating(AdminFanAccount account, int stars) async {
    final token = _token;
    if (token == null) return;
    setState(() {
      _busyId = account.id;
      _error = null;
      _notice = null;
    });
    try {
      final updated = await _repository.setRating(
        adminToken: token,
        account: account,
        stars: stars,
      );
      if (!mounted) return;
      setState(() {
        _accounts = _accounts
            .map((item) => item.id == account.id ? updated : item)
            .toList(growable: false);
        _notice = updated.isVip
            ? 'Notation enregistrée : membre VIP.'
            : 'Notation enregistrée : membre standard.';
      });
    } on ApiException {
      if (!mounted) return;
      setState(() {
        _error = 'Impossible d’enregistrer la notation.';
      });
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    return Theme(
      data: JsoTheme.paper(),
      child: Scaffold(
        backgroundColor: JsoColors.paper,
        appBar: AppBar(
          title: const Text('Gestion des supporters'),
          backgroundColor: JsoColors.paper,
          foregroundColor: JsoColors.inkText,
          actions: [
            IconButton(
              tooltip: 'Actualiser',
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(JsoSpacing.md),
            children: [
              TextField(
                controller: _search,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _load(),
                decoration: InputDecoration(
                  hintText: 'Rechercher par nom ou e-mail',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: IconButton(
                    tooltip: 'Effacer la recherche',
                    onPressed: () {
                      _search.clear();
                      _load();
                    },
                    icon: const Icon(Icons.close_rounded),
                  ),
                ),
              ),
              const SizedBox(height: JsoSpacing.md),
              Wrap(
                spacing: JsoSpacing.sm,
                runSpacing: JsoSpacing.sm,
                children: [
                  _filter(
                    'Tous',
                    _status == 'all',
                    () => setState(() => _status = 'all'),
                  ),
                  _filter(
                    'Actifs',
                    _status == 'active',
                    () => setState(() => _status = 'active'),
                  ),
                  _filter(
                    'Bloqués',
                    _status == 'blocked',
                    () => setState(() => _status = 'blocked'),
                  ),
                ],
              ),
              const SizedBox(height: JsoSpacing.sm),
              Wrap(
                spacing: JsoSpacing.sm,
                children: [
                  _filter(
                    'Tous VIP',
                    _vip == 'all',
                    () => setState(() => _vip = 'all'),
                  ),
                  _filter(
                    'VIP',
                    _vip == 'vip',
                    () => setState(() => _vip = 'vip'),
                  ),
                  _filter(
                    'Standard',
                    _vip == 'standard',
                    () => setState(() => _vip = 'standard'),
                  ),
                ],
              ),
              const SizedBox(height: JsoSpacing.md),
              if (_error != null)
                _message(
                  _error!,
                  const Color(0xFFB42318),
                  Icons.error_outline_rounded,
                ),
              if (_notice != null)
                _message(
                  _notice!,
                  const Color(0xFF087F5B),
                  Icons.check_circle_outline_rounded,
                ),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.all(JsoSpacing.xl),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (filtered.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(JsoSpacing.xl),
                  child: Column(
                    children: [
                      Icon(
                        Icons.people_outline_rounded,
                        size: 42,
                        color: JsoColors.inkMuted,
                      ),
                      SizedBox(height: JsoSpacing.sm),
                      Text(
                        'Aucun supporter trouvé',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                )
              else ...[
                Text(
                  '${filtered.length} supporter(s)',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    color: JsoColors.inkText,
                  ),
                ),
                const SizedBox(height: JsoSpacing.sm),
                for (final account in filtered) _accountCard(account),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _accountCard(AdminFanAccount account) {
    final busy = _busyId == account.id;
    final name = account.displayName.trim();
    return Card(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: JsoSpacing.sm),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(JsoRadius.card),
        side: const BorderSide(color: JsoColors.borderLight),
      ),
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: JsoColors.navy,
                  child: Text(
                    name.isEmpty ? 'JS' : name.substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      color: JsoColors.gold,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: JsoSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name.isEmpty ? 'Supporter JSO' : name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          color: JsoColors.inkText,
                        ),
                      ),
                      Text(
                        account.email,
                        style: const TextStyle(
                          fontSize: 12,
                          color: JsoColors.inkMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                Chip(
                  label: Text(account.isActive ? 'Actif' : 'Bloqué'),
                  backgroundColor: account.isActive
                      ? const Color(0xFFE5F8EF)
                      : const Color(0xFFFFE8E8),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: JsoSpacing.sm),
            Row(
              children: [
                const Icon(
                  Icons.star_rounded,
                  color: Color(0xFFB58100),
                  size: 18,
                ),
                const SizedBox(width: 4),
                Text(
                  '${account.fanRatingStars} étoiles · ${account.isVip ? 'VIP' : 'Standard'}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: JsoColors.inkText,
                  ),
                ),
              ],
            ),
            const SizedBox(height: JsoSpacing.sm),
            Wrap(
              spacing: JsoSpacing.sm,
              runSpacing: JsoSpacing.sm,
              children: [
                for (final stars in const [1, 3, 5])
                  OutlinedButton(
                    onPressed: busy || account.fanRatingStars == stars
                        ? null
                        : () => _setRating(account, stars),
                    child: Text('$stars ★'),
                  ),
                OutlinedButton.icon(
                  onPressed: busy ? null : () => _toggleStatus(account),
                  icon: Icon(
                    account.isActive
                        ? Icons.block_rounded
                        : Icons.check_circle_outline_rounded,
                  ),
                  label: Text(account.isActive ? 'Bloquer' : 'Réactiver'),
                ),
              ],
            ),
            if (busy) const LinearProgressIndicator(),
          ],
        ),
      ),
    );
  }

  Widget _filter(String label, bool selected, VoidCallback onTap) => ChoiceChip(
    label: Text(label),
    selected: selected,
    onSelected: (_) => onTap(),
  );

  Widget _message(String message, Color color, IconData icon) => Container(
    margin: const EdgeInsets.only(bottom: JsoSpacing.sm),
    padding: const EdgeInsets.all(JsoSpacing.md),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(JsoRadius.card),
      border: Border.all(color: color.withValues(alpha: 0.35)),
    ),
    child: Row(
      children: [
        Icon(icon, color: color),
        const SizedBox(width: JsoSpacing.sm),
        Expanded(
          child: Text(
            message,
            style: TextStyle(color: color, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    ),
  );
}
