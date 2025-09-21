<?php

// -------------------- CONFIG --------------------
$DB_HOST = getenv('DB_HOST') ?: 'localhost';
$DB_NAME = getenv('DB_NAME') ?: 'agile_app';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASS = getenv('DB_PASS') ?: '';
$DB_CHARSET = 'utf8mb4';

// -------------------- DB CONNECT --------------------
require_once('inc/db.inc.php');
// -------------------- HELPERS --------------------
require_once('inc/helpers.inc.php');

// -------------------- DB SETUP (idempotent) --------------------
require_once('inc/dbSetup.inc.php');

// -------------------- API IMPLEMENTATIONS --------------------
require_once('inc/Api.inc.php');
// -------------------- UI (HTML) --------------------
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agile Backlog App</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

    <link href="https://code.jquery.com/ui/1.13.2/themes/base/jquery-ui.min.css" rel="stylesheet">

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/summernote@0.8.20/dist/summernote-lite.min.css">

    <link href="styles.css" rel="stylesheet">
</head>

<body>
    <nav class="navbar navbar-expand-lg navbar-dark">
        <div class="container-fluid">
            <a class="navbar-brand" href="#">Agile Backlog</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="nav">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0" role="tablist">
                    <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-backlog" type="button" role="tab">Backlog</button>
                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-kanban" type="button" role="tab">Kanban</button>
                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-settings" type="button" role="tab">Settings</button>
                    <button id="themeToggle" class="nav-link">🌙</button>
                </ul>
            </div>
        </div>
    </nav>
    <div class="container-fluid py-3">
        <div class="tab-content">
            <!-- Backlog View -->
            <div class="tab-pane fade show active" id="tab-backlog">
                <div class="row g-3">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">

                                <div class="col-4">
                                    <span>Backlog Tree</span>
                                </div>
                                <div class="col-7">
                                    <div class="d-flex gap-2 justify-content-end">
                                        <button class="btn btn-sm btn-outline-light" id="expandAll">+</button>
                                        <button class="btn btn-sm btn-outline-light" id="collapseAll">-</button>
                                        <select id="treeViewMode" class="form-select form-select-sm customdrpdown" title="Tree view">
                                            <option value="epics">Epics only</option>
                                            <option value="features">Epics + Features</option>
                                            <option value="stories">Up to User Stories</option>
                                            <option value="all">All expanded</option>
                                        </select>
                                        <button id="openWorkItem"
                                            class="btn btn-sm btn-success"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasWorkItem"> + Work Item </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="row ">
                                    <div class="col-12 d-flex justify-content-end">
                                        <input id="treeSearch" class="form-control form-control-sm" placeholder="Search backlog">
                                    </div>
                                </div>
                                <hr>
                                <div id="tree" class="tree"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Kanban View -->
            <div class="tab-pane fade" id="tab-kanban">
                <div class="row g-3">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header d-flex flex-wrap gap-2 justify-content-between align-items-center">
                                <span>Kanban Board </span>
                                <div class="d-flex align-items-center gap-2">
                                    <label for="kanbanIteration" class="small-muted">Iteration:</label>
                                    <select id="kanbanIteration" class="form-select form-select-sm" style="min-width:220px"></select>
                                    <button class="btn btn-sm btn-outline-light" id="refreshBoard">Refresh</button>
                                </div>
                            </div>
                            <div class="card-body">
                                <div id="kanban" class="kanban"></div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Settings View -->
            <div class="tab-pane fade" id="tab-settings">
                <!-- Settings Tabs -->
                <ul class="nav nav-tabs mb-3" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#set-db" type="button" role="tab">Database</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#set-columns" type="button" role="tab">Kanban Columns</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#set-projects" type="button" role="tab">Projects</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#set-areas" type="button" role="tab">Areas</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#set-iterations" type="button" role="tab">Iterations</button>
                    </li>
                </ul>

                <div class="tab-content">
                    <!-- DB -->
                    <div class="tab-pane fade show active" id="set-db" role="tabpanel">
                        <div class="row g-3">
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-header">Database</div>
                                    <div class="card-body">
                                        <button class="btn btn-danger" id="runSetup">Run DB Setup</button>
                                        <button class="btn btn-secondary ms-2" id="seedUsers">Seed Sample Users</button>
                                        <div class="small-muted mt-2">Setup is idempotent. Seeding adds Alice/Bob/Chloe if missing.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Kanban Columns -->
                    <div class="tab-pane fade" id="set-columns" role="tabpanel">
                        <div class="row g-3">
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-header">Kanban Columns</div>
                                    <div class="card-body">
                                        <form id="addColumnForm" class="row g-2">
                                            <div class="col-7"><input class="form-control" name="name" placeholder="Column name (e.g. QA)" /></div>
                                            <div class="col-3"><input class="form-control" name="order_index" type="number" value="0" /></div>
                                            <div class="col-2"><button class="btn btn-primary w-100">Add</button></div>
                                        </form>
                                        <ul id="columnsList" class="list-group mt-3"></ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Projects -->
                    <div class="tab-pane fade" id="set-projects" role="tabpanel">
                        <div class="row g-3">
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-header d-flex justify-content-between align-items-center">
                                        <span>Projects</span>
                                        <form id="projAddForm" class="d-flex gap-2">
                                            <input class="form-control form-control-sm" name="name" placeholder="New project name">
                                            <button class="btn btn-sm btn-primary">Add</button>
                                        </form>
                                    </div>
                                    <div class="card-body">
                                        <ul id="projList" class="list-group"></ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Areas -->
                    <div class="tab-pane fade" id="set-areas" role="tabpanel">
                        <div class="row g-3">
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-header d-flex justify-content-between align-items-center">
                                        <span>Areas</span>
                                        <div class="d-flex gap-2 align-items-center">
                                            <select id="areasProjectSel" class="form-select form-select-sm" style="min-width:220px"></select>
                                            <form id="areaAddForm" class="d-flex gap-2">
                                                <input class="form-control form-control-sm" style="min-width: 200px;" name="name" placeholder="New area name">
                                                <button class="btn btn-sm btn-primary">Add</button>
                                            </form>
                                        </div>
                                    </div>
                                    <div class="card-body">
                                        <ul id="areaList" class="list-group"></ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Iterations -->
                    <div class="tab-pane fade" id="set-iterations" role="tabpanel">
                        <div class="row g-3">
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-header d-flex justify-content-between align-items-center">
                                        <span>Iterations</span>
                                        <div class="d-flex gap-2 align-items-center">
                                            <select id="itersProjectSel" class="form-select form-select-sm" style="min-width:220px"></select>
                                            <form id="iterAddForm" class="d-flex gap-2">
                                                <input class="form-control form-control-sm" name="path" placeholder="New iteration path (e.g., 2025/Sprint-1)">
                                                <input class="form-control form-control-sm" type="date" name="start_date" title="Start (optional)">
                                                <input class="form-control form-control-sm" type="date" name="end_date" title="End (optional)">
                                                <button class="btn btn-sm btn-primary">Add</button>
                                            </form>
                                        </div>
                                    </div>
                                    <div class="card-body">
                                        <ul id="iterList" class="list-group"></ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Time Entries Modal -->
    <div class="modal fade" id="timeModal" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Time Entries — Task <span id="tmTaskId"></span></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="timeForm" class="row g-2 align-items-end">
                        <input type="hidden" name="task_id" id="tmTaskIdInput" />
                        <div class="col-md-3">
                            <label class="form-label">User</label>
                            <select class="form-select" name="user_id" id="tmUser"></select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Date</label>
                            <input type="date" class="form-control" name="entry_date" value="<?php echo date('Y-m-d'); ?>" />
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Hours</label>
                            <input type="number" step="0.25" class="form-control" name="hours" />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Notes</label>
                            <input class="form-control" name="notes" />
                        </div>
                        <div class="col-md-1">
                            <button class="btn btn-success w-100">Add</button>
                        </div>
                    </form>
                    <hr />
                    <div id="timeTable"></div>
                </div>
            </div>
        </div>
    </div>

    <div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasWorkItem" style="width: 50vw;">
        <div class="offcanvas-header">
            <h5 class="offcanvas-title">Add New Work Item</h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body">
            <div class="mb-2">
                <label class="form-label">Project</label>
                <div class="d-flex gap-2">
                    <select id="project" class="form-select"></select>
                    <button class="btn btn-sm btn-primary" id="addProject">+</button>
                </div>
            </div>
            <div class="mb-2">
                <label class="form-label">Area</label>
                <div class="d-flex gap-2">
                    <select id="area" class="form-select"></select>
                    <button class="btn btn-sm btn-primary" id="addArea">+</button>
                </div>
            </div>
            <div class="mb-2">
                <label class="form-label">Iteration Path</label>
                <div class="d-flex gap-2">
                    <select id="iteration" class="form-select"></select>
                    <button class="btn btn-sm btn-primary" id="addIteration">+</button>
                </div>
            </div>
            <hr />
            <div class="mb-2">
                <label class="form-label">Work Item</label>
                <div class="d-flex gap-2">
                    <select id="newType" class="form-select">
                        <option value="epic">Epic</option>
                        <option value="feature">Feature</option>
                        <option value="user_story">User Story</option>
                        <option value="task">Task</option>
                    </select>
                    <input id="newTitle" placeholder="Title" class="form-control" />
                </div>
            </div>
            <div class="mb-2">
                <!-- rich text description  -->
                <textarea id="newDesc" placeholder="Description" class="form-control mt-2"></textarea>
            </div>
            <div class="mb-2">
                <div class="mt-2 d-flex gap-2">
                    <input id="newParent" class="form-control" placeholder="Parent ID (optional)" />
                </div>
            </div>
            <div class="mb-2">
                <div class="mb-2 d-none" id="storyPointsWrap">
                    <label class="form-label">Story Points</label>
                    <input id="newPoints" type="number" min="0" step="1" class="form-control" placeholder="e.g., 3">
                </div>
            </div>
            <hr>
            <div class="mb-2">
                <button class="btn btn-success" id="createItem">Create</button>
            </div>
        </div>
    </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/summernote@0.8.20/dist/summernote-lite.min.js"></script>
    <script src="app.js"></script>

</body>

</html>