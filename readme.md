# Agile Backlog App

A lightweight PHP + MySQL application for managing agile work items (Epics, Features, User Stories, Tasks) with both a **backlog tree** and a **Kanban board** interface.

This project was designed to be **idempotent** and easy to set up locally using XAMPP/MAMP/Docker or any standard PHP/MySQL stack.

---

## 🚀 Features

- **Work Item Hierarchy**  
  Supports Epics → Features → User Stories → Tasks.  

- **Kanban Board**  
  Visualize your items by status columns (default: New, Work in Progress, Closed).  

- **Backlog Tree**  
  Expand/collapse by Epics, Features, or Stories. Includes search and filtering.  

- **Database Setup**  
  One-click DB setup with default projects, areas, iterations, and kanban columns.  

- **Story Points**  
  Add and update Fibonacci-style story points per User Story.  

- **Time Entries**  
  Log hours worked per task with date, user, and notes.  

- **Utilities**  
  - Users, Projects, Areas, Iterations management  
  - Relations (blocks, duplicates, relates_to, etc.)  
  - Sample data seeding for quick testing  

---

## 🛠 Requirements

- PHP 8.0 or newer  
- MySQL / MariaDB  
- XAMPP, MAMP, or Docker LAMP stack  
- Composer (optional, if you want to add dependencies)

---

## 📦 Installation

1. Clone or copy this repository into your web root:

   ```bash
   git clone https://github.com/your-username/agile-backlog-app.git
   cd agile-backlog-app/b
   

📊 Database Tables
	•	work_items – Epics, Features, Stories, Tasks with hierarchy and story points
	•	projects, areas, iterations – Organizational metadata
	•	relations – Links between items (blocks, duplicates, relates_to)
	•	time_entries – Hours logged by users
	•	kanban_columns – Configurable workflow states

⸻

🧩 Extending
	•	Add new Kanban columns via Settings → Kanban Columns.
	•	Insert default work items by seeding via Settings → Database → Seed Users.
	•	Use the REST-style API (inc/Api.inc.php) to connect a front-end.

⸻

📜 License

This project is released under the MIT License.
You are free to use, modify, and distribute it.

⸻

⚠️ Disclaimer

This software is provided free of charge and “as is”.

We make no guarantees regarding:
	•	Correctness of implementation
	•	Fitness for a particular purpose
	•	Reliability, performance, or continued maintenance
	•	Compatibility with future versions of PHP/MySQL

By using this software, you acknowledge and agree that:
	•	All risk is yours when running or deploying it
	•	The authors and contributors are not responsible for any issues, bugs, damages, data loss, or other problems
	•	There is no warranty of any kind, explicit or implied

If you need guaranteed support or enterprise features, you should fork and extend the project according to your needs.
