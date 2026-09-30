import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/api/api_exception.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/ticket_scan_result.dart';
import '../../data/repositories/admin_tickets_repository.dart';
import '../../shared/format.dart';
import '../auth/admin_auth_controller.dart';

/// Staff ticket scanner — reserved to authenticated administrators
/// (SuperAdmin / ClubAdmin / MatchManager). Reached from the admin panel.
///
/// Scans a QR (camera via [MobileScanner]) or accepts a manually typed code,
/// then calls `POST /api/admin/tickets/validate` and `.../check-in`. The check-in
/// is atomic server-side: a second scan of the same ticket returns
/// `AlreadyUsed`. A colour-coded banner plus haptic feedback gives an immediate
/// verdict, and the recent history is loaded from the server.
///
/// The camera plugin is confined to this screen; if it is unavailable the
/// manual-entry field still drives the full validate/check-in flow.
class StaffScannerScreen extends StatefulWidget {
  const StaffScannerScreen({super.key});

  static Route<void> route() =>
      MaterialPageRoute<void>(builder: (_) => const StaffScannerScreen());

  @override
  State<StaffScannerScreen> createState() => _StaffScannerScreenState();
}

class _StaffScannerScreenState extends State<StaffScannerScreen> {
  static const String _gateStorageKey = 'staff_scanner_gate_id';
  static const String _deviceStorageKey = 'staff_scanner_device_id';
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage();
  final MobileScannerController _scanner = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  final TextEditingController _manual = TextEditingController();

  bool _busy = false;
  bool _cameraEnabled = true;
  bool _configurationRequired = false;
  String? _gateId;
  String? _deviceId;
  String? _matchId;
  List<ScannerMatch> _matches = const <ScannerMatch>[];
  TicketScanResult? _last;
  List<TicketCheckInEntry> _history = const <TicketCheckInEntry>[];

  @override
  void initState() {
    super.initState();
    _loadScannerConfiguration();
    _loadMatches();
    _loadHistory();
  }

  Future<void> _loadScannerConfiguration() async {
    try {
      final values = await Future.wait<String?>([
        _secureStorage.read(key: _gateStorageKey),
        _secureStorage.read(key: _deviceStorageKey),
      ]);
      if (!mounted) return;
      setState(() {
        _gateId = values[0];
        _deviceId = values[1];
      });
    } on Exception {
      // Secure storage is best-effort for device configuration. The scanner
      // remains usable with manual configuration if the platform keystore is
      // temporarily unavailable.
    }
  }

  @override
  void dispose() {
    _scanner.dispose();
    _manual.dispose();
    super.dispose();
  }

  AdminTicketsRepository get _repo => context.read<AdminTicketsRepository>();
  String? get _adminToken => context.read<AdminAuthController>().accessToken;

  Future<void> _loadMatches() async {
    final token = _adminToken;
    if (token == null) return;
    try {
      final items = await _repo.matches(adminToken: token);
      if (!mounted) return;
      setState(() {
        _matches = items;
        _configurationRequired = items.isNotEmpty && _matchId == null;
        if (_matchId != null && !items.any((match) => match.id == _matchId)) {
          _matchId = null;
        }
      });
    } on ApiException {
      // Match configuration is best-effort; scanning can still be configured manually.
    }
  }

  Future<void> _loadHistory() async {
    final token = _adminToken;
    if (token == null) return;
    try {
      final items = await _repo.recentCheckIns(adminToken: token, take: 20);
      if (mounted) setState(() => _history = items);
    } on ApiException {
      // History is best-effort; a failure must not block scanning.
    }
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_busy) return;
    final raw = capture.barcodes
        .map((b) => b.rawValue)
        .firstWhere((v) => v != null && v.isNotEmpty, orElse: () => null);
    if (raw == null) return;
    await _checkIn(raw);
  }

  Future<void> _submitManual() async {
    final value = _manual.text.trim();
    if (value.isEmpty) return;
    await _checkIn(value);
    _manual.clear();
  }

  Future<void> _checkIn(String scannedValue) async {
    final token = _adminToken;
    if (token == null || _busy) return;
    if (_configurationRequired) {
      await _configureScanner();
      return;
    }
    setState(() => _busy = true);
    try {
      final result = await _repo.checkIn(
        adminToken: token,
        scannedValue: scannedValue,
        matchId: _matchId,
        gateId: _gateId,
        deviceId: _deviceId,
      );
      if (result.isValid) {
        await HapticFeedback.mediumImpact();
      } else {
        await HapticFeedback.vibrate();
      }
      if (!mounted) return;
      setState(() => _last = result);
      await _loadHistory();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(
        () => _last = TicketScanResult(result: 'Invalid', message: e.message),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }



  Future<void> _persistValue(String key, String? value) async {
    if (value == null || value.isEmpty) {
      await _secureStorage.delete(key: key);
      return;
    }
    await _secureStorage.write(key: key, value: value);
  }

  Future<void> _configureScanner() async {
    final token = _adminToken;
    if (token == null) return;

    ScannerConfiguration configuration;
    try {
      configuration = await _repo.configuration(adminToken: token);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
      return;
    }

    if (!mounted) return;

    String? selectedGate = _gateId;
    String? selectedDevice = _deviceId;
    String? selectedMatch = _matchId;

    if (selectedGate != null &&
        !configuration.gates.any((gate) => gate.code == selectedGate)) {
      selectedGate = null;
    }
    if (selectedDevice != null &&
        !configuration.devices.any((device) => device.deviceCode == selectedDevice)) {
      selectedDevice = null;
    }
    if (selectedMatch != null &&
        !_matches.any((match) => match.id == selectedMatch)) {
      selectedMatch = null;
    }

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) {
          final devices = selectedGate == null
              ? configuration.devices
              : configuration.devices
                  .where((device) =>
                      device.gateId == null ||
                      configuration.gates
                          .where((gate) => gate.code == selectedGate)
                          .map((gate) => gate.id)
                          .contains(device.gateId))
                  .toList(growable: false);

          if (selectedDevice != null &&
              !devices.any((device) => device.deviceCode == selectedDevice)) {
            selectedDevice = null;
          }

          return AlertDialog(
            title: const Text('Configurazione scanner'),
            content: SizedBox(
              width: 420,
              child: configuration.gates.isEmpty &&
                      configuration.devices.isEmpty
                  ? const Text(
                      'Nessun Gate o dispositivo scanner è stato assegnato al tuo account.',
                    )
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_matches.isNotEmpty)
                          DropdownButtonFormField<String?>(
                            value: selectedMatch,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'Partita operativa',
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('Seleziona automaticamente'),
                              ),
                              ..._matches.map(
                                (match) => DropdownMenuItem<String?>(
                                  value: match.id,
                                  child: Text(
                                    'vs ${match.opponentName} · ${_formatMatchDate(match.kickoffAt)}',
                                  ),
                                ),
                              ),
                            ],
                            onChanged: (value) {
                              setDialogState(() {
                                selectedMatch = value;
                              });
                            },
                          ),
                        if (_matches.isNotEmpty &&
                            (configuration.gates.isNotEmpty ||
                                configuration.devices.isNotEmpty))
                          const SizedBox(height: JsoSpacing.md),

                        if (configuration.gates.isNotEmpty)
                          DropdownButtonFormField<String?>(
                            value: selectedGate,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'Gate autorizzato',
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('Qualsiasi Gate'),
                              ),
                              ...configuration.gates.map(
                                (gate) => DropdownMenuItem<String?>(
                                  value: gate.code,
                                  child: Text('${gate.code} · ${gate.name}'),
                                ),
                              ),
                            ],
                            onChanged: (value) {
                              setDialogState(() {
                                selectedGate = value;
                              });
                            },
                          ),
                        if (configuration.gates.isNotEmpty &&
                            configuration.devices.isNotEmpty)
                          const SizedBox(height: JsoSpacing.md),
                        if (configuration.devices.isNotEmpty)
                          DropdownButtonFormField<String?>(
                            value: selectedDevice,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'Scanner autorizzato',
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('Qualsiasi dispositivo'),
                              ),
                              ...devices.map(
                                (device) => DropdownMenuItem<String?>(
                                  value: device.deviceCode,
                                  child: Text(
                                    '${device.deviceCode} · ${device.name}',
                                  ),
                                ),
                              ),
                            ],
                            onChanged: (value) {
                              setDialogState(() {
                                selectedDevice = value;
                              });
                            },
                          ),
                      ],
                    ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Annulla'),
              ),
              if (configuration.gates.isNotEmpty ||
                  configuration.devices.isNotEmpty ||
                  _matches.isNotEmpty)
                FilledButton(
                  onPressed: () async {
                    try {
                      await Future.wait([
                        _persistValue(_gateStorageKey, selectedGate),
                        _persistValue(_deviceStorageKey, selectedDevice),
                      ]);
                      if (!mounted) return;
                      setState(() {
                        _gateId = selectedGate;
                        _deviceId = selectedDevice;
                        _matchId = selectedMatch;
                      });
                      if (dialogContext.mounted) {
                        Navigator.pop(dialogContext);
                      }
                    } on Exception {
                      if (!mounted) return;
                      ScaffoldMessenger.of(this.context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Impossibile salvare la configurazione sul dispositivo.',
                          ),
                        ),
                      );
                    }
                  },
                  child: const Text('Salva'),
                ),
            ],
          );
        },
      ),
    );
  }

  String _formatMatchDate(DateTime value) {
    final local = value.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '$day/$month $hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contrôle des billets'),
        actions: [
          IconButton(
            tooltip: 'Configuration scanner',
            icon: const Icon(Icons.tune_rounded),
            onPressed: _configureScanner,
          ),
          IconButton(
            tooltip: _cameraEnabled
                ? 'Masquer la caméra'
                : 'Afficher la caméra',
            icon: Icon(
              _cameraEnabled
                  ? Icons.videocam_rounded
                  : Icons.videocam_off_rounded,
            ),
            onPressed: () => setState(() => _cameraEnabled = !_cameraEnabled),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(JsoSpacing.md),
          children: [
            _ScannerContextCard(
              match: _matches.where((m) => m.id == _matchId).firstOrNull,
              gateId: _gateId,
              deviceId: _deviceId,
              configurationRequired: _configurationRequired,
              onConfigure: _configureScanner,
            ),
            const SizedBox(height: JsoSpacing.md),
            if (_cameraEnabled)
              _CameraBox(controller: _scanner, onDetect: _onDetect),
            const SizedBox(height: JsoSpacing.md),
            _ManualEntry(
              controller: _manual,
              enabled: !_busy,
              onSubmit: _submitManual,
            ),
            const SizedBox(height: JsoSpacing.md),
            if (_last != null) _ResultBanner(result: _last!),
            const SizedBox(height: JsoSpacing.lg),
            const Text(
              'Derniers passages',
              style: TextStyle(
                color: JsoColors.gold,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: JsoSpacing.sm),
            if (_history.isEmpty)
              const Text(
                'Aucun contrôle récent.',
                style: TextStyle(color: JsoColors.muted),
              )
            else
              ..._history.map((e) => _HistoryTile(entry: e)),
          ],
        ),
      ),
    );
  }
}

class _ScannerContextCard extends StatelessWidget {
  const _ScannerContextCard({
    required this.match,
    required this.gateId,
    required this.deviceId,
    required this.configurationRequired,
    required this.onConfigure,
  });

  final ScannerMatch? match;
  final String? gateId;
  final String? deviceId;
  final bool configurationRequired;
  final VoidCallback onConfigure;

  @override
  Widget build(BuildContext context) {
    final ready = !configurationRequired && match != null && gateId != null && deviceId != null;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  ready ? Icons.verified_rounded : Icons.warning_amber_rounded,
                  color: ready ? JsoColors.cyan : JsoColors.gold,
                ),
                const SizedBox(width: JsoSpacing.sm),
                Expanded(
                  child: Text(
                    ready ? 'Scanner operativo' : 'Configurazione richiesta',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                TextButton(
                  onPressed: onConfigure,
                  child: const Text('Modifica'),
                ),
              ],
            ),
            const SizedBox(height: JsoSpacing.sm),
            Text(match == null
                ? 'Partita: non selezionata'
                : 'Partita: ${match!.opponentName}'),
            Text('Gate: ${gateId ?? 'non configurato'}'),
            Text('Device: ${deviceId ?? 'non configurato'}'),
            if (!ready) ...[
              const SizedBox(height: JsoSpacing.sm),
              const Text(
                'Seleziona partita, Gate e dispositivo autorizzati prima di effettuare il check-in.',
                style: TextStyle(color: JsoColors.muted),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CameraBox extends StatelessWidget {
  const _CameraBox({required this.controller, required this.onDetect});

  final MobileScannerController controller;
  final void Function(BarcodeCapture) onDetect;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(JsoRadius.largeCard),
      child: AspectRatio(
        aspectRatio: 1,
        child: MobileScanner(controller: controller, onDetect: onDetect),
      ),
    );
  }
}

class _ManualEntry extends StatelessWidget {
  const _ManualEntry({
    required this.controller,
    required this.enabled,
    required this.onSubmit,
  });

  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            enabled: enabled,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => onSubmit(),
            decoration: const InputDecoration(
              labelText: 'Saisie manuelle du code',
              hintText: 'JSO1.… ou code du billet',
            ),
          ),
        ),
        const SizedBox(width: JsoSpacing.sm),
        ElevatedButton(
          onPressed: enabled ? onSubmit : null,
          child: const Text('Valider'),
        ),
      ],
    );
  }
}

class _ResultBanner extends StatelessWidget {
  const _ResultBanner({required this.result});

  final TicketScanResult result;

  @override
  Widget build(BuildContext context) {
    final (Color color, IconData icon) = switch (result.result) {
      'Valid' => (JsoColors.cyan, Icons.check_circle_rounded),
      'AlreadyUsed' => (JsoColors.gold, Icons.history_toggle_off_rounded),
      'Cancelled' => (JsoColors.muted, Icons.block_rounded),
      'WrongMatch' => (JsoColors.blueBright, Icons.event_busy_rounded),
      _ => (const Color(0xFFFF6B6B), Icons.error_rounded),
    };
    final ticket = result.ticket;
    return Container(
      padding: const EdgeInsets.all(JsoSpacing.md),
      decoration: BoxDecoration(
        color: JsoColors.navy2,
        borderRadius: BorderRadius.circular(JsoRadius.control),
        border: Border.all(color: color, width: 2),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(width: JsoSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  result.message,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                if (ticket != null) ...[
                  const SizedBox(height: JsoSpacing.xs),
                  Text(
                    '${ticket.ticketTypeName} · ${ticket.quantity} place(s)',
                    style: const TextStyle(color: JsoColors.white),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.entry});

  final TicketCheckInEntry entry;

  @override
  Widget build(BuildContext context) {
    final color = switch (entry.result) {
      'Valid' => JsoColors.cyan,
      'AlreadyUsed' => JsoColors.gold,
      _ => JsoColors.muted,
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: JsoSpacing.xs),
      child: Row(
        children: [
          Icon(Icons.circle, size: 10, color: color),
          const SizedBox(width: JsoSpacing.sm),
          Expanded(
            child: Text(
              _label(entry.result),
              style: const TextStyle(color: JsoColors.white),
            ),
          ),
          if (entry.checkedInAt != null)
            Text(
              JsoFormat.time(entry.checkedInAt!),
              style: const TextStyle(color: JsoColors.muted, fontSize: 12),
            ),
        ],
      ),
    );
  }

  static String _label(String result) => switch (result) {
    'Valid' => 'Entrée validée',
    'AlreadyUsed' => 'Billet déjà utilisé',
    'Cancelled' => 'Billet annulé',
    'WrongMatch' => 'Autre match',
    _ => 'Billet non valide',
  };
}
