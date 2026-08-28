import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';
import 'package:tray_manager/tray_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize window manager
  await windowManager.ensureInitialized();
  
  WindowOptions windowOptions = const WindowOptions(
    size: Size(400, 600),
    center: true,
    backgroundColor: Colors.transparent,
    skipTaskbar: true,       // Hide from dock
    titleBarStyle: TitleBarStyle.hidden, // Frameless window
  );

  await windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.hide(); // Start hidden, only show on tray click
  });

  // Initialize tray manager
  await trayManager.setIcon('images/tray_icon.png'); // We will add this asset shortly
  
  Menu menu = Menu(
    items: [
      MenuItem(
        key: 'show_window',
        label: 'Show EventHorizon',
      ),
      MenuItem.separator(),
      MenuItem(
        key: 'exit_app',
        label: 'Exit',
      ),
    ],
  );
  await trayManager.setContextMenu(menu);

  runApp(const EventHorizonApp());
}

class EventHorizonApp extends StatelessWidget {
  const EventHorizonApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EventHorizon',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF1E1E1E),
        colorScheme: ColorScheme.dark(
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
      body: Container(
        decoration: BoxDecoration(
          border: Border.all(color: Colors.white24, width: 1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            // Custom drag area for the frameless window
            GestureDetector(
              onPanUpdate: (details) {
                windowManager.startDragging();
              },
              child: Container(
                height: 40,
                color: Colors.transparent,
                child: const Center(
                  child: Text(
                    "EventHorizon",
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
            const Expanded(
              child: Center(
                child: Text('AI Workflows loading...'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
