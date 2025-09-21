<?php

$action = $_GET['action'] ?? null;
if ($action) {
    try {
        switch ($action) {
            case 'setup':
                run_setup();
                break;
            case 'projects:list':
                api_projects_list();
                break;
            case 'projects:create':
                api_projects_create();
                break;
            case 'areas:list':
                api_areas_list();
                break;
            case 'areas:create':
                api_areas_create();
                break;
            case 'iterations:list':
                api_iterations_list();
                break;
            case 'iterations:create':
                api_iterations_create();
                break;
            case 'users:list':
                api_users_list();
                break;
            case 'users:create':
                api_users_create();
                break;

            case 'items:create':
                api_items_create();
                break;
            case 'items:update':
                api_items_update();
                break;
            case 'items:delete':
                api_items_delete();
                break;
            case 'items:tree':
                api_items_tree();
                break;
            case 'items:reorder':
                api_items_reorder();
                break;
            case 'relations:add':
                api_relations_add();
                break;
            case 'relations:list':
                api_relations_list();
                break;

            case 'time:list':
                api_time_list();
                break;
            case 'time:add':
                api_time_add();
                break;
            case 'time:delete':
                api_time_delete();
                break;
            case 'kanban:columns:list':
                api_kanban_columns_list();
                break;
            case 'kanban:columns:add':
                api_kanban_columns_add();
                break;
            case 'kanban:columns:update':
                api_kanban_columns_update();
                break;
            case 'kanban:columns:delete':
                api_kanban_columns_delete();
                break;
            case 'kanban:board':
                api_kanban_board();
                break;
            case 'kanban:move':
                api_kanban_move();
                break;
            case 'projects:update':
                api_projects_update();
                break;
            case 'projects:delete':
                api_projects_delete();
                break;
            case 'areas:update':
                api_areas_update();
                break;
            case 'areas:delete':
                api_areas_delete();
                break;
            case 'iterations:update':
                api_iterations_update();
                break;
            case 'iterations:delete':
                api_iterations_delete();
                break;
            default:
                json_out(false, [], 'Unknown action');
        }
    } catch (Throwable $e) {
        json_out(false, [], $e->getMessage());
    }
}


function api_projects_update()
{
    $id = (int)post('id');
    $name = trim(post('name', ''));
    if (!$id || $name === '') json_out(false, [], 'id and name required');
    $st = db()->prepare("UPDATE projects SET name=? WHERE id=?");
    $st->execute([$name, $id]);
    json_out(true, [], 'Updated');
}
function api_projects_delete()
{
    $id = (int)post('id');
    if (!$id) json_out(false, [], 'id required');
    $st = db()->prepare("DELETE FROM projects WHERE id=?");
    $st->execute([$id]);
    json_out(true, [], 'Deleted');
}

function api_areas_update()
{
    $id = (int)post('id');
    $name = trim(post('name', ''));
    if (!$id || $name === '') json_out(false, [], 'id and name required');
    $st = db()->prepare("UPDATE areas SET name=? WHERE id=?");
    $st->execute([$name, $id]);
    json_out(true, [], 'Updated');
}
function api_areas_delete()
{
    $id = (int)post('id');
    if (!$id) json_out(false, [], 'id required');
    $st = db()->prepare("DELETE FROM areas WHERE id=?");
    $st->execute([$id]);
    json_out(true, [], 'Deleted');
}

function api_iterations_update()
{
    $id = (int)post('id');
    $path = trim(post('path', ''));
    $sd = post('start_date') ?: null;
    $ed = post('end_date') ?: null;
    if (!$id || $path === '') json_out(false, [], 'id and path required');
    $st = db()->prepare("UPDATE iterations SET path=?, start_date=?, end_date=? WHERE id=?");
    $st->execute([$path, $sd, $ed, $id]);
    json_out(true, [], 'Updated');
}
function api_iterations_delete()
{
    $id = (int)post('id');
    if (!$id) json_out(false, [], 'id required');
    $st = db()->prepare("DELETE FROM iterations WHERE id=?");
    $st->execute([$id]);
    json_out(true, [], 'Deleted');
}

function api_projects_list()
{
    $st = db()->query("SELECT * FROM projects ORDER BY name");
    json_out(true, $st->fetchAll());
}
function api_projects_create()
{
    $name = trim(post('name', ''));
    if (!$name) json_out(false, [], 'Name required');
    $st = db()->prepare("INSERT INTO projects (name) VALUES (?)");
    $st->execute([$name]);
    json_out(true, ['id' => db()->lastInsertId()], 'Created');
}

function api_areas_list()
{
    $pid = (int)($_GET['project_id'] ?? 0);
    $st = db()->prepare("SELECT * FROM areas WHERE project_id=? ORDER BY name");
    $st->execute([$pid]);
    json_out(true, $st->fetchAll());
}
function api_areas_create()
{
    $pid = (int)post('project_id');
    $name = trim(post('name', ''));
    if (!$pid || !$name) json_out(false, [], 'Project + name required');
    $st = db()->prepare("INSERT INTO areas(project_id,name) VALUES(?,?)");
    $st->execute([$pid, $name]);
    json_out(true, ['id' => db()->lastInsertId()]);
}

function api_iterations_list()
{
    $pid = (int)($_GET['project_id'] ?? 0);
    $st = db()->prepare("SELECT * FROM iterations WHERE project_id=? ORDER BY start_date IS NULL, start_date");
    $st->execute([$pid]);
    json_out(true, $st->fetchAll());
}
function api_iterations_create()
{
    $pid = (int)post('project_id');
    $path = trim(post('path', ''));
    $sd = post('start_date');
    $ed = post('end_date');
    if (!$pid || !$path) json_out(false, [], 'Project + path required');
    $st = db()->prepare("INSERT INTO iterations(project_id,path,start_date,end_date) VALUES(?,?,?,?)");
    $st->execute([$pid, $path, $sd ?: null, $ed ?: null]);
    json_out(true, ['id' => db()->lastInsertId()]);
}

function api_users_list()
{
    $st = db()->query("SELECT * FROM users ORDER BY name");
    json_out(true, $st->fetchAll());
}
function api_users_create()
{
    $name = trim(post('name', ''));
    $email = trim(post('email', ''));
    if (!$name) json_out(false, [], 'Name required');
    $st = db()->prepare("INSERT INTO users(name,email) VALUES(?,?)");
    $st->execute([$name, $email ?: null]);
    json_out(true, ['id' => db()->lastInsertId()]);
}

function api_items_create()
{
    $type = post('type');
    $title = trim(post('title', ''));
    $desc = post('description');
    $parent_id = post('parent_id');
    $project_id = (int)post('project_id');
    $area_id = post('area_id');
    $iteration_id = post('iteration_id');

    $sp   = post('story_points', null);
    $sp   = ($type === 'user_story' && $sp !== null && $sp !== '') ? (int)$sp : null;


    if (!$type || !$title || !$project_id) json_out(false, [], 'Type, title, project required');
    // Enforce hierarchy rule
    if ($parent_id) {
        $p = fetch_item($parent_id);
        $ok = ($p && (
            ($p['type'] == 'epic' && $type == 'feature') ||
            ($p['type'] == 'feature' && $type == 'user_story') ||
            ($p['type'] == 'user_story' && $type == 'task')
        ));
        if (!$ok) json_out(false, [], 'Invalid parent/type relationship');
    }
    $st = db()->prepare("INSERT INTO work_items(type,title,description,parent_id,project_id,area_id,iteration_id,order_index,status, story_points) VALUES(?,?,?,?,?,?,?,?,?,?)");
    $st->execute([$type, $title, $desc ?: null, $parent_id ?: null, $project_id, $area_id ?: null, $iteration_id ?: null, next_sibling_order($parent_id), 'New',$sp]);
    json_out(true, ['id' => db()->lastInsertId()]);
}

// function api_items_update()
// {
//     $id = (int)post('id');
//     $title = trim(post('title', ''));
//     $desc = post('description');
//     $area_id = post('area_id');
//     $iteration_id = post('iteration_id');
//     $status = post('status');
//     if (!$id) json_out(false, [], 'ID required');
//     $st = db()->prepare("UPDATE work_items SET title=?, description=?, area_id=?, iteration_id=?, status=COALESCE(?,status) WHERE id=?");
//     $st->execute([$title ?: null, $desc ?: null, $area_id ?: null, $iteration_id ?: null, $status ?: null, $id]);
//     json_out(true, [], 'Updated');
// }


function api_items_update()
{
    $id = (int)post('id');
    if (!$id) json_out(false, [], 'ID required');

    $title        = trim(post('title', ''));
    $desc         = post('description');
    $area_id      = post('area_id');
    $iteration_id = post('iteration_id');
    $status       = post('status');

    // We may need the type to decide how to treat story_points
    $type = post('type', null);
    if ($type === null) {
        $t = db()->prepare('SELECT type FROM work_items WHERE id=?');
        $t->execute([$id]);
        $type = $t->fetchColumn() ?: '';
    }

    // Build dynamic SET clause
    $fields = [
        'title=?',
        'description=?',
        'area_id=?',
        'iteration_id=?',
        'status=COALESCE(?,status)',
    ];
    $params = [
        $title !== '' ? $title : null,
        $desc ?: null,
        $area_id ?: null,
        $iteration_id ?: null,
        $status ?: null,
    ];

    // Story points: only update if the client sent it
    if (array_key_exists('story_points', $_POST)) {
        $spRaw = post('story_points', null);
        $sp = ($type === 'user_story' && $spRaw !== null && $spRaw !== '') ? (int)$spRaw : null;
        $fields[] = 'story_points=?';
        $params[] = $sp;
    }

    $params[] = $id;

    $sql = 'UPDATE work_items SET ' . implode(',', $fields) . ' WHERE id=?';
    $st = db()->prepare($sql);
    $st->execute($params);

    json_out(true, [], 'Updated');
}



function api_items_delete()
{
    $id = (int)post('id');
    if (!$id) json_out(false, [], 'ID required');
    $st = db()->prepare("DELETE FROM work_items WHERE id=?");
    $st->execute([$id]);
    json_out(true, [], 'Deleted');
}

function api_items_tree()
{
    $project_id = (int)($_GET['project_id'] ?? 0);
    if (!$project_id) json_out(false, [], 'project_id required');
    $st = db()->prepare("SELECT * FROM work_items WHERE project_id=? ORDER BY COALESCE(parent_id,0), order_index, id");
    $st->execute([$project_id]);
    $rows = $st->fetchAll();
    // Build tree
    $byId = [];
    foreach ($rows as $r) {
        $r['children'] = [];
        $byId[$r['id']] = $r;
    }
    $roots = [];
    foreach ($byId as $id => &$n) {
        if ($n['parent_id']) {
            $byId[$n['parent_id']]['children'][] = &$n;
        } else {
            $roots[] = &$n;
        }
    }
    json_out(true, $roots);
}

function api_items_reorder()
{
    $parent_id = post('parent_id'); // null or id
    $ids = post('ids'); // array of work_item ids in new order
    if (!is_array($ids)) json_out(false, [], 'ids[] required');
    $pdo = db();
    $pdo->beginTransaction();
    $st = $pdo->prepare("UPDATE work_items SET order_index=? WHERE id=?");
    foreach (array_values($ids) as $i => $id) {
        $st->execute([$i, $id]);
    }
    $pdo->commit();
    json_out(true, [], 'Reordered');
}

function api_relations_add()
{
    $a = (int)post('a');
    $b = (int)post('b');
    $t = post('type', 'relates_to');
    if (!$a || !$b) json_out(false, [], 'IDs required');
    $st = db()->prepare("INSERT IGNORE INTO relations(work_item_id,related_item_id,relation_type) VALUES(?,?,?)");
    $st->execute([$a, $b, $t]);
    json_out(true, [], 'Linked');
}
function api_relations_list()
{
    $id = (int)($_GET['id'] ?? 0);
    $st = db()->prepare("SELECT r.*, w.title as related_title, w.type as related_type FROM relations r JOIN work_items w ON w.id=r.related_item_id WHERE r.work_item_id=? ORDER BY r.id DESC");
    $st->execute([$id]);
    json_out(true, $st->fetchAll());
}

function api_time_list()
{
    $task_id = (int)($_GET['task_id'] ?? 0);
    $st = db()->prepare("SELECT t.*, u.name as user_name FROM time_entries t JOIN users u ON u.id=t.user_id WHERE t.task_id=? ORDER BY t.entry_date DESC, t.id DESC");
    $st->execute([$task_id]);
    json_out(true, $st->fetchAll());
}
function api_time_add()
{
    $task_id = (int)post('task_id');
    $user_id = (int)post('user_id');
    $date = post('entry_date');
    $hours = (float)post('hours');
    $notes = post('notes');
    // validate task type
    $w = fetch_item($task_id);
    if (!$w || $w['type'] != 'task') json_out(false, [], 'Time can only be added to tasks');
    $st = db()->prepare("INSERT INTO time_entries(task_id,user_id,entry_date,hours,notes) VALUES(?,?,?,?,?)");
    $st->execute([$task_id, $user_id, $date, $hours, $notes ?: null]);
    json_out(true, ['id' => db()->lastInsertId()], 'Added');
}
function api_time_delete()
{
    $id = (int)post('id');
    $st = db()->prepare("DELETE FROM time_entries WHERE id=?");
    $st->execute([$id]);
    json_out(true, [], 'Deleted');
}
function api_kanban_columns_update()
{
    $id  = (int)post('id');
    $name = isset($_POST['name']) ? trim(post('name', '')) : null;
    $ord  = post('order_index', null);

    if (!$id) json_out(false, [], 'id required');

    $fields = [];
    $params = [];

    if ($name !== null) {
        if ($name === '') json_out(false, [], 'name cannot be empty');
        $fields[] = 'name=?';
        $params[] = $name;
    }
    if ($ord !== null && $ord !== '') {
        $fields[] = 'order_index=?';
        $params[] = (int)$ord;
    }

    if (!$fields) json_out(false, [], 'Nothing to update');

    $params[] = $id;

    try {
        $st = db()->prepare('UPDATE kanban_columns SET ' . implode(',', $fields) . ' WHERE id=?');
        $st->execute($params);
        json_out(true, [], 'Updated');
    } catch (PDOException $e) {
        // Unique constraint on (project_id, name)
        if ($e->getCode() === '23000') {
            json_out(false, [], 'A column with that name already exists for this project.');
        }
        throw $e;
    }
}
function api_kanban_columns_list()
{
    $pid = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;
    if ($pid) {
        $st = db()->prepare("SELECT * FROM kanban_columns WHERE project_id=? ORDER BY order_index");
        $st->execute([$pid]);
        $rows = $st->fetchAll();
        if (!$rows) { // fallback to global
            $rows = db()->query("SELECT * FROM kanban_columns WHERE project_id IS NULL ORDER BY order_index")->fetchAll();
        }
    } else {
        $rows = db()->query("SELECT * FROM kanban_columns WHERE project_id IS NULL ORDER BY order_index")->fetchAll();
    }
    json_out(true, $rows);
}
function api_kanban_columns_add()
{
    $pid = post('project_id');
    $name = trim(post('name', ''));
    $ord = (int)post('order_index');
    if (!$name) json_out(false, [], 'Name required');
    $st = db()->prepare("INSERT INTO kanban_columns(project_id,name,order_index) VALUES(?,?,?)");
    $st->execute([$pid !== '' ? (int)$pid : null, $name, $ord]);
    json_out(true, ['id' => db()->lastInsertId()]);
}
function api_kanban_columns_delete()
{
    $id = (int)post('id');
    $st = db()->prepare("DELETE FROM kanban_columns WHERE id=?");
    $st->execute([$id]);
    json_out(true, [], 'Deleted');
}
function api_kanban_board()
{
    $project_id = (int)($_GET['project_id'] ?? 0);
    if (!$project_id) json_out(false, [], 'project_id required');

    $iteration_id = (isset($_GET['iteration_id']) && $_GET['iteration_id'] !== '')
        ? (int)$_GET['iteration_id']
        : null;

    // Columns
    $cols = get_kanban_columns($project_id);
    $names = array_map(fn($c) => $c['name'], $cols);
    if (!$names) {
        $names = ['New', 'WIP', 'Closed'];
    }

    // If an iteration is selected -> STORY MODE (show user stories with nested tasks)
    // 1) Fetch stories for this project + iteration, limited to valid columns
    $phCols = implode(',', array_fill(0, count($names), '?'));
    $sqlStories = "SELECT id, title, description, status, story_points
                   FROM work_items
                   WHERE project_id=? AND type='user_story'
                     AND status IN ($phCols)";
    if ($iteration_id !== null) {
        $sqlStories .=   " AND iteration_id = ?";
    }else{
        $sqlStories .=   " AND iteration_id = 1";
    }
    $sqlStories .=   "ORDER BY id";

    if ($iteration_id !== null) {
        $paramsStories = array_merge([$project_id], $names, [$iteration_id]);
    } else {
        $paramsStories = array_merge([$project_id], $names);
    }

    $stS = db()->prepare($sqlStories);
    $stS->execute($paramsStories);
    $stories = $stS->fetchAll();

    $grouped = [];
    foreach ($names as $n) {
        $grouped[$n] = [];
    }

    if ($stories) {
        // 2) Fetch all tasks under these stories in one shot
        $storyIds = array_column($stories, 'id');
        $phStories = implode(',', array_fill(0, count($storyIds), '?'));
        $sqlTasks = "SELECT id, title, description, status, parent_id
                   FROM work_items
                   WHERE parent_id IN ($phStories)
                   ORDER BY order_index, id";
        $stT = db()->prepare($sqlTasks);
        $stT->execute($storyIds);
        $tasks = $stT->fetchAll();

        // 3) Attach tasks to their stories
        $tasksByParent = [];
        foreach ($tasks as $t) {
            $pid = $t['parent_id'];
            if (!isset($tasksByParent[$pid])) $tasksByParent[$pid] = [];
            $tasksByParent[$pid][] = $t;
        }

        foreach ($stories as $s) {
            $s['tasks'] = $tasksByParent[$s['id']] ?? [];
            // Group story by its own saved status (column)
            $grouped[$s['status']][] = $s;
        }
    }

    json_out(true, [
        'columns' => $names,
        'stories' => $grouped,  // <-- story mode payload
    ]);
}
function api_kanban_move()
{
    $id = (int)post('id');
    $status = post('status');
    $st = db()->prepare("UPDATE work_items SET status=? WHERE id=?");
    $st->execute([$status, $id]);
    json_out(true, [], 'Moved');
}

function get_kanban_columns($project_id)
{
    if ($project_id) {
        $st = db()->prepare("SELECT * FROM kanban_columns WHERE project_id=? ORDER BY order_index");
        $st->execute([$project_id]);
        $rows = $st->fetchAll();
        if (!$rows) {
            $rows = db()->query("SELECT * FROM kanban_columns WHERE project_id IS NULL ORDER BY order_index")->fetchAll();
        }
        return $rows;
    } else {
        return db()->query("SELECT * FROM kanban_columns WHERE project_id IS NULL ORDER BY order_index")->fetchAll();
    }
}

function fetch_item($id)
{
    $st = db()->prepare("SELECT * FROM work_items WHERE id=?");
    $st->execute([$id]);
    return $st->fetch();
}
function next_sibling_order($parent_id)
{
    if ($parent_id) {
        $st = db()->prepare("SELECT COALESCE(MAX(order_index),-1)+1 n FROM work_items WHERE parent_id=?");
        $st->execute([$parent_id]);
    } else {
        $st = db()->query("SELECT COALESCE(MAX(order_index),-1)+1 n FROM work_items WHERE parent_id IS NULL");
    }
    return (int)($st->fetch()['n'] ?? 0);
}
