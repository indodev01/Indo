import 'package:flutter/material.dart';

void main() {
  runApp(const IndoDevApp());
}

class IndoDevApp extends StatelessWidget {
  const IndoDevApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Indo Dev',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const DashboardPage(),
    );
  }
}

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Indo Dev'),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            onPressed: () {},
            icon: const Icon(Icons.notifications_none),
          ),
          const Padding(
            padding: EdgeInsets.only(right: 16),
            child: CircleAvatar(child: Icon(Icons.person_outline)),
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth >= 800;
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1100),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Build. Preview. Get Your App.',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Create and customize apps without writing code.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.add),
                      label: const Text('Create New App'),
                    ),
                    const SizedBox(height: 32),
                    Text(
                      'Your Projects',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 16),
                    GridView.count(
                      crossAxisCount: wide ? 3 : 1,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      childAspectRatio: wide ? 1.55 : 2.8,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      children: const [
                        ProjectCard(
                          title: 'Start your first app',
                          subtitle: 'Choose a template and begin building.',
                          icon: Icons.rocket_launch_outlined,
                        ),
                        ProjectCard(
                          title: 'Template Library',
                          subtitle: 'Explore starter layouts for your next idea.',
                          icon: Icons.dashboard_customize_outlined,
                        ),
                        ProjectCard(
                          title: 'Preview Engine',
                          subtitle: 'Preview your app before publishing.',
                          icon: Icons.phone_android_outlined,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class ProjectCard extends StatelessWidget {
  const ProjectCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    super.key,
  });

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 32),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(subtitle),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
