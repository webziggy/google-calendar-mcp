import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';
import 'package:tray_manager/tray_manager.dart';
import 'package:googleapis/calendar/v3.dart' as cal;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/services.dart'; // For clipboard

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
    windowButtonVisibility: false,
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
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: Colors.transparent,
        fontFamily: '.SF Pro Text', // Native macOS font feel
        colorScheme: const ColorScheme.dark(
          primary: Colors.deepPurpleAccent,
          secondary: Colors.blueAccent,
          surface: Colors.transparent,
          background: Colors.transparent,
        ),
        dividerColor: Colors.white.withOpacity(0.1),
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
      body: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 40.0, sigmaY: 40.0),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.55), // macOS Frosted Glass Tint
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.15), width: 1),
            ),
            child: Consumer<AuthService>(
              builder: (context, auth, child) {
                if (auth.currentUser == null) return const LoginScreen();
                return DashboardScreen(user: auth.currentUser!);
              },
            ),
          ),
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
            color: Colors.transparent,
            child: const Center(
              child: Text("EventHorizon", style: TextStyle(fontWeight: FontWeight.w600, color: Colors.white70, fontSize: 13)),
            ),
          ),
        ),
        Divider(height: 1, color: Colors.white.withOpacity(0.1)),
        Expanded(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.blur_on, size: 64, color: Colors.deepPurpleAccent),
                const SizedBox(height: 16),
                const Text("Sync your AI Workflows", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => context.read<AuthService>().signIn(),
                  icon: const Icon(Icons.login, size: 16),
                  label: const Text("Sign In with Google"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.1),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
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
    if (dt == null) return "";
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
        // Unified Mac-style Toolbar
        GestureDetector(
          onPanUpdate: (details) => windowManager.startDragging(),
          child: Container(
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            color: Colors.transparent, // Drag area
            child: Row(
              children: [
                const Icon(Icons.blur_on, size: 16, color: Colors.deepPurpleAccent),
                const SizedBox(width: 8),
                const Text("EventHorizon", style: TextStyle(fontWeight: FontWeight.w600, color: Colors.white, fontSize: 13, letterSpacing: -0.2)),
                const Spacer(),
                IconButton(
                  icon: Icon(Icons.refresh, size: 16, color: Colors.white.withOpacity(0.7)),
                  onPressed: _loadEvents,
                  splashRadius: 16,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
                IconButton(
                  icon: Icon(Icons.settings_outlined, size: 16, color: Colors.white.withOpacity(0.7)),
                  onPressed: () {},
                  splashRadius: 16,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
                const SizedBox(width: 8),
                PopupMenuButton<String>(
                  offset: const Offset(0, 36),
                  color: Colors.black.withOpacity(0.8),
                  elevation: 20,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(color: Colors.white.withOpacity(0.1)),
                  ),
                  tooltip: "Account",
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withOpacity(0.2), width: 1),
                    ),
                    child: CircleAvatar(
                      backgroundImage: NetworkImage(widget.user.photoUrl ?? ''),
                      radius: 12,
                    ),
                  ),
                  onSelected: (value) {
                    if (value == 'logout') context.read<AuthService>().signOut();
                    if (value == 'quit') windowManager.destroy();
                  },
                  itemBuilder: (BuildContext context) => [
                    PopupMenuItem<String>(
                      enabled: false,
                      height: 30,
                      child: Text(widget.user.email, style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.5))),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem<String>(
                      value: 'logout',
                      height: 32,
                      child: Text('Sign Out', style: TextStyle(fontSize: 13, color: Colors.white)),
                    ),
                    const PopupMenuItem<String>(
                      value: 'quit',
                      height: 32,
                      child: Text('Quit', style: TextStyle(fontSize: 13, color: Colors.redAccent)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        Divider(height: 1, color: Colors.white.withOpacity(0.1)),
        // Mac-style Events List
        Expanded(
          child: _isLoading 
            ? const Center(child: CircularProgressIndicator(strokeWidth: 2, color: Colors.deepPurpleAccent))
            : _events.isEmpty 
              ? Center(child: Text("No Workflows Scheduled", style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13)))
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: _events.length,
                  separatorBuilder: (context, index) => Divider(height: 1, color: Colors.white.withOpacity(0.05)),
                  itemBuilder: (context, index) {
                    final event = _events[index];
                    final privateProps = event.extendedProperties?.private;
                    bool hasAiMetadata = privateProps != null && privateProps.isNotEmpty;

                    return Theme(
                      data: Theme.of(context).copyWith(dividerColor: Colors.transparent), // removes ExpansionTile borders
                      child: ExpansionTile(
                        iconColor: Colors.white54,
                        collapsedIconColor: Colors.white38,
                        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        leading: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              _formatTime(event.start),
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.8)),
                            ),
                          ],
                        ),
                        title: Text(
                          event.summary ?? "Untitled",
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.white),
                        ),
                        subtitle: hasAiMetadata 
                          ? const Text("AI Workflow Attached", style: TextStyle(fontSize: 11, color: Colors.deepPurpleAccent)) 
                          : null,
                        children: [
                          if (hasAiMetadata)
                            Container(
                              width: double.infinity,
                              margin: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.4),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.white.withOpacity(0.05)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text("JSON Payload", style: TextStyle(fontSize: 10, color: Colors.white54)),
                                      IconButton(
                                        icon: const Icon(Icons.copy, size: 12, color: Colors.white54),
                                        onPressed: () {
                                          Clipboard.setData(ClipboardData(text: const JsonEncoder.withIndent('  ').convert(privateProps)));
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: const Text('Payload copied to clipboard', style: TextStyle(fontSize: 12)),
                                              backgroundColor: Colors.deepPurpleAccent.withOpacity(0.8),
                                              behavior: SnackBarBehavior.floating,
                                              duration: const Duration(seconds: 2),
                                            )
                                          );
                                        },
                                        constraints: const BoxConstraints(),
                                        padding: EdgeInsets.zero,
                                      )
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  SelectableText(
                                    const JsonEncoder.withIndent('  ').convert(privateProps),
                                    style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: Colors.greenAccent),
                                  ),
                                ],
                              ),
                            ),
                          if (event.description != null)
                            Container(
                              width: double.infinity,
                              margin: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                              child: SelectableText(
                                event.description!,
                                style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.7)),
                              ),
                            )
                        ],
                      ),
                    );
                  },
                ),
        )
      ],
    );
  }
}
