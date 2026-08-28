import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';
import 'package:tray_manager/tray_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await windowManager.ensureInitialized();
  
  WindowOptions windowOptions = const WindowOptions(
    size: Size(380, 600), // Slightly narrower, typical for macOS tray apps
    center: true,
    backgroundColor: Colors.transparent,
    skipTaskbar: true,       
    titleBarStyle: TitleBarStyle.hidden, 
  );

  await windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.hide(); 
  });

  await trayManager.setIcon('images/tray_icon.png');
  
  // Optional: A right-click context menu (optional, can leave empty if we only want the left-click drop down)
  Menu menu = Menu(
    items: [
      MenuItem(
        key: 'exit_app',
        label: 'Quit EventHorizon',
      ),
    ],
  );
  await trayManager.setContextMenu(menu);

  runApp(const EventHorizonApp());
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
        // Center the window horizontally beneath the tray icon
        double x = trayBounds.left + (trayBounds.width / 2) - (windowSize.width / 2);
        // Place the window immediately below the menu bar
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
      // Allow the user to cleanly quit the background process
      windowManager.destroy();
    }
  }

  @override
  void onWindowBlur() async {
    // Global click-away: hide the window when the user clicks anywhere else
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
      home: const DashboardView(),
    );
  }
}

class DashboardView extends StatelessWidget {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E1E), // Solid dark background
          border: Border.all(color: Colors.white12, width: 1),
          borderRadius: BorderRadius.circular(12),
          // Add a subtle drop shadow to make it pop against the desktop
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
            // Header / Drag Area
            GestureDetector(
              onPanUpdate: (details) {
                // Allows the user to tear the window away from the menu bar!
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
            const Expanded(
              child: Center(
                child: Text(
                  'AI Workflows loading...',
                  style: TextStyle(color: Colors.white54),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
