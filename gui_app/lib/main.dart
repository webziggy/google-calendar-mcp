import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';
import 'package:tray_manager/tray_manager.dart';
import 'package:googleapis/calendar/v3.dart' as cal;
import 'package:google_sign_in/google_sign_in.dart';

import 'services/auth_service.dart';
import 'services/calendar_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await windowManager.ensureInitialized();
  
  WindowOptions windowOptions = const WindowOptions(
    size: Size(380, 600),
    center: true,
    backgroundColor: Colors.transparent,
    skipTaskbar: true,       
    titleBarStyle: TitleBarStyle.hidden, 
    windowButtonVisibility: false, // <-- This is the native fix!
  );

  await windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.setAsFrameless();
    await windowManager.hide(); 
  });

  await trayManager.setIcon('images/tray_icon.png');
  
  Menu menu = Menu(
    items: [
      MenuItem(key: 'exit_app', label: 'Quit EventHorizon'),
    ],
  );
  await trayManager.setContextMenu(menu);

  runApp(
    ChangeNotifierProvider(
      create: (context) => AuthService(),
      child: const EventHorizonApp(),
    ),
  );
}

class EventHorizonApp extends StatefulWidget {
  const EventHorizonApp({super.key});

  @override
  State<EventHorizonApp> createState() => _EventHorizonAppState();
}

class _EventHorizonAppState extends State<EventHorizonApp> with TrayListener, WindowListener {
  @override
  void initState() {
    super.initState();
    trayManager.addListener(this);
    windowManager.addListener(this);
  }

  @override
  void dispose() {
    trayManager.removeListener(this);
    windowManager.removeListener(this);
    super.dispose();
  }

  @override
  void onTrayIconMouseDown() async {
    bool isVisible = await windowManager.isVisible();
    if (isVisible) {
      await windowManager.hide();
    } else {
      Rect? trayBounds = await trayManager.getBounds();
      Size windowSize = await windowManager.getSize();
      if (trayBounds != null) {
        double x = trayBounds.left + (trayBounds.width / 2) - (windowSize.width / 2);
        double y = trayBounds.bottom;
        await windowManager.setPosition(Offset(x, y));
      }
      await windowManager.show();
      await windowManager.focus();
    }
  }

  @override
  void onTrayMenuItemClick(MenuItem menuItem) {
    if (menuItem.key == 'exit_app') windowManager.destroy();
  }

  @override
  void onWindowBlur() async {
    await windowManager.hide();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'EventHorizon',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF1E1E1E),
        colorScheme: const ColorScheme.dark(
          primary: Colors.deepPurpleAccent,
          secondary: Colors.blueAccent,
        ),
      ),
      home: const MainGatekeeper(),
    );
  }
}

class MainGatekeeper extends StatelessWidget {
  const MainGatekeeper({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E1E),
          border: Border.all(color: Colors.white12, width: 1),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 20,
              offset: const Offset(0, 10),
            )
          ]
        ),
        // Auth State Routing delegates the entire view to the sub-screens
        child: Consumer<AuthService>(
          builder: (context, auth, child) {
            if (auth.currentUser == null) return const LoginScreen();
            return DashboardScreen(user: auth.currentUser!);
          },
        ),
      ),
    );
  }
}

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        GestureDetector(
          onPanUpdate: (details) => windowManager.startDragging(),
          child: Container(
            height: 40,
            decoration: const BoxDecoration(
              color: Colors.transparent,
              borderRadius: BorderRadius.only(topLeft: Radius.circular(12), topRight: Radius.circular(12))
            ),
            child: const Center(
              child: Text("EventHorizon", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white70)),
            ),
          ),
        ),
        const Divider(height: 1, color: Colors.white12),
        Expanded(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.hub, size: 64, color: Colors.deepPurpleAccent),
                const SizedBox(height: 16),
                const Text("Sync your AI Workflows", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => context.read<AuthService>().signIn(),
                  icon: const Icon(Icons.login),
                  label: const Text("Sign In with Google"),
                )
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class DashboardScreen extends StatefulWidget {
  final GoogleSignInAccount user;
  const DashboardScreen({super.key, required this.user});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late CalendarService _calendarService;
  List<cal.Event> _events = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _calendarService = CalendarService(widget.user);
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() => _isLoading = true);
    await _calendarService.init();
    final events = await _calendarService.fetchAiEvents();
    setState(() {
      _events = events;
      _isLoading = false;
    });
  }

  String _formatTime(cal.EventDateTime? dt) {
    if (dt == null) return "Unknown time";
    if (dt.dateTime != null) {
      final local = dt.dateTime!.toLocal();
      return "${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}";
    }
    return "All Day";
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Unified Header
        GestureDetector(
          onPanUpdate: (details) => windowManager.startDragging(),
          child: Container(
            height: 40,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: const BoxDecoration(
              color: Colors.transparent,
              borderRadius: BorderRadius.only(topLeft: Radius.circular(12), topRight: Radius.circular(12))
            ),
            child: Row(
              children: [
                const Text("EventHorizon", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white70)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.refresh, size: 14, color: Colors.white70),
                  onPressed: _loadEvents,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  splashRadius: 16,
                ),
                const SizedBox(width: 12),
                IconButton(
                  icon: const Icon(Icons.settings, size: 14, color: Colors.white70),
                  onPressed: () {
                    // TODO: Open Settings View
                  },
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  splashRadius: 16,
                ),
                const SizedBox(width: 12),
                PopupMenuButton<String>(
                  offset: const Offset(0, 30),
                  color: const Color(0xFF2C2C2C),
                  tooltip: "Account",
                  child: CircleAvatar(
                    backgroundImage: NetworkImage(widget.user.photoUrl ?? ''),
                    radius: 10,
                  ),
                  onSelected: (value) {
                    if (value == 'logout') {
                      context.read<AuthService>().signOut();
                    } else if (value == 'quit') {
                      windowManager.destroy();
                    }
                  },
                  itemBuilder: (BuildContext context) => [
                    PopupMenuItem<String>(
                      enabled: false,
                      child: Text(
                        widget.user.email,
                        style: const TextStyle(fontSize: 11, color: Colors.white54),
                      ),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem<String>(
                      value: 'logout',
                      child: Text('Sign Out', style: TextStyle(fontSize: 13)),
                    ),
                    const PopupMenuItem<String>(
                      value: 'quit',
                      child: Text('Quit EventHorizon', style: TextStyle(fontSize: 13, color: Colors.redAccent)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const Divider(height: 1, color: Colors.white12),
        // Events List
        Expanded(
          child: _isLoading 
            ? const Center(child: CircularProgressIndicator())
            : _events.isEmpty 
              ? const Center(child: Text("No AI-managed events found.", style: TextStyle(color: Colors.white54)))
              : ListView.builder(
                  itemCount: _events.length,
                  itemBuilder: (context, index) {
                    final event = _events[index];
                    final privateProps = event.extendedProperties?.private;
                    bool hasAiMetadata = privateProps != null && privateProps.isNotEmpty;

                    return ExpansionTile(
                      leading: Icon(
                        hasAiMetadata ? Icons.smart_toy : Icons.event,
                        color: hasAiMetadata ? Colors.deepPurpleAccent : Colors.white54,
                      ),
                      title: Text(event.summary ?? "Untitled Workflow"),
                      subtitle: Text(_formatTime(event.start)),
                      children: [
                        if (hasAiMetadata)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            color: Colors.black26,
                            child: SelectableText(
                              const JsonEncoder.withIndent('  ').convert(privateProps),
                              style: const TextStyle(fontFamily: 'monospace', fontSize: 12, color: Colors.greenAccent),
                            ),
                          ),
                        if (event.description != null)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            child: SelectableText(
                              event.description!,
                              style: const TextStyle(fontSize: 12, color: Colors.white70),
                            ),
                          )
                      ],
                    );
                  },
                ),
        )
      ],
    );
  }
}
