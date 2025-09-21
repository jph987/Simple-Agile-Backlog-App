<?php

function run_setup()
{
  $sql = [];
  $sql[] = "CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB";

  $sql[] = "CREATE TABLE IF NOT EXISTS areas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  ) ENGINE=InnoDB";

  $sql[] = "CREATE TABLE IF NOT EXISTS iterations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    path VARCHAR(200) NOT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  ) ENGINE=InnoDB";

  $sql[] = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NULL
  ) ENGINE=InnoDB";

  $sql[] = "CREATE TABLE IF NOT EXISTS work_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('epic','feature','user_story','task') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    parent_id INT NULL,
    project_id INT NOT NULL,
    area_id INT NULL,
    iteration_id INT NULL,
    order_index INT NOT NULL DEFAULT 0,
    status VARCHAR(40) NOT NULL DEFAULT 'New',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    route TEXT NULL DEFAULT NULL,
    story_points INT NULL DEFAULT NULL,
    FOREIGN KEY (parent_id) REFERENCES work_items(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    FOREIGN KEY (iteration_id) REFERENCES iterations(id) ON DELETE SET NULL,
    INDEX(parent_id), INDEX(project_id), INDEX(type), INDEX(status),
    UNIQUE KEY uniq_task_parent_title (parent_id, type, title)
  ) ENGINE=InnoDB";

  $sql[] = "CREATE TABLE IF NOT EXISTS relations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_item_id INT NOT NULL,
    related_item_id INT NOT NULL,
    relation_type ENUM('relates_to','duplicates','blocks','blocked_by','parent_of','child_of') NOT NULL DEFAULT 'relates_to',
    FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE,
    FOREIGN KEY (related_item_id) REFERENCES work_items(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_rel (work_item_id, related_item_id, relation_type)
  ) ENGINE=InnoDB";

  $sql[] = "CREATE TABLE IF NOT EXISTS time_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    entry_date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES work_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX(task_id), INDEX(user_id), INDEX(entry_date)
  ) ENGINE=InnoDB";

  $sql[] = "CREATE TABLE IF NOT EXISTS kanban_columns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NULL,
    name VARCHAR(40) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    UNIQUE KEY uniq_proj_name (project_id, name),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  ) ENGINE=InnoDB";

  $pdo = db();
  foreach ($sql as $q) {
    $pdo->exec($q);
  }

  // Seed default columns if empty
  $cnt = $pdo->query("SELECT COUNT(*) c FROM kanban_columns")->fetch()['c'] ?? 0;
  if ($cnt == 0) {
    $ins = $pdo->prepare("INSERT INTO kanban_columns (project_id,name,order_index) VALUES (NULL,?,?)");
    foreach ([['New', 0], ['WIP', 1], ['Closed', 2]] as $c) {
      $ins->execute([$c[0], $c[1]]);
    }
  }



  json_out(true, [], 'DB setup complete.');
}
