import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';
import 'package:tray_manager/tray_manager.dart';

import 'package:google_sign_in/google_sign_in.dart';

import 'services/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await windowManager.ensureInitialized();
  
  WindowOptions windowOptions = const WindowOptions(
    size: Size(380, 600),
    center: true,
    backgroundColor: Colors.transparent,
    skipTaskbar: true,       
    titleBarStyle: TitleBarStyle.hidden, 
  );

  await windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.hide(); 
  });

  await trayManager.setIcon('images/tray_icon.png');
  
  Menu menu = Menu(
    items: [
      MenuItem(
        key: 'exit_app',
        label: 'Quit EventHorizon',
      ),
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
    if (menuItem.key == 'exit_app') {
      windowManager.destroy();
    }
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
        child: Column(
          children: [
            // Drag Header
            GestureDetector(
              onPanUpdate: (details) {
                windowManager.startDragging();
              },
              child: Container(
                height: 40,
                decoration: const BoxDecoration(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(12),
                    topRight: Radius.circular(12)
                  )
                ),
                child: const Center(
                  child: Text(
                    "EventHorizon",
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white70),
                  ),
                ),
              ),
            ),
            const Divider(height: 1, color: Colors.white12),
            
            // Auth State Routing
            Expanded(
              child: Consumer<AuthService>(
                builder: (context, auth, child) {
                  if (auth.currentUser == null) {
                    return const LoginScreen();
                  }
                  return DashboardScreen(user: auth.currentUser!);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.hub, size: 64, color: Colors.deepPurpleAccent),
          const SizedBox(height: 16),
          const Text(
            "Sync your AI Workflows",
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 32.0),
            child: Text(
              "EventHorizon needs access to your Google Calendar to render the AI dashboard.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white54),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => context.read<AuthService>().signIn(),
            icon: const Icon(Icons.login),
            label: const Text("Sign In with Google"),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.deepPurpleAccent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          )
        ],
      ),
    );
  }
}

class DashboardScreen extends StatelessWidget {
  final GoogleSignInAccount user;
  const DashboardScreen({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(
            backgroundImage: NetworkImage(user.photoUrl ?? ''),
            radius: 32,
          ),
          const SizedBox(height: 16),
          Text(
            "Authenticated as",
            style: const TextStyle(color: Colors.white54),
          ),
          Text(
            user.displayName ?? user.email,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: () => context.read<AuthService>().signOut(),
            child: const Text("Sign Out"),
          )
        ],
      ),
    );
  }
}
